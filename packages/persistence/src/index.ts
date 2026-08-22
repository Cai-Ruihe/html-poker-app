export interface VersionedRecord<State> {
  readonly revision: number;
  readonly state: State;
}

export type CommitResult =
  | { readonly status: "committed" }
  | {
      readonly reason: "corrupt" | "quota" | "unavailable";
      readonly status: "failed";
    }
  | { readonly actualRevision: number; readonly status: "revision-conflict" };

export interface AtomicTableStore<State> {
  commit(
    expectedRevision: number,
    next: VersionedRecord<State>,
  ): Promise<CommitResult>;
  load(): Promise<VersionedRecord<State> | undefined>;
  remove(): Promise<void>;
}

export function createMemoryTableStore<State>(): AtomicTableStore<State> {
  let current: VersionedRecord<State> | undefined;

  return {
    async commit(expectedRevision, next) {
      const actualRevision = current?.revision ?? 0;
      if (actualRevision !== expectedRevision) {
        return { actualRevision, status: "revision-conflict" };
      }
      current = structuredClone(next);
      return { status: "committed" };
    },
    async load() {
      return current ? structuredClone(current) : undefined;
    },
    async remove() {
      current = undefined;
    },
  };
}

interface EncryptedRecord {
  readonly ciphertext: ArrayBuffer;
  readonly iv: Uint8Array<ArrayBuffer>;
  readonly recordKey: string;
  readonly revision: number;
  readonly schemaVersion: number;
}

export interface IndexedDbTableStoreOptions {
  readonly databaseName: string;
  readonly recordKey: string;
  readonly schemaVersion?: number;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("IndexedDB request failed.")),
      { once: true },
    );
  });
}

function transactionFinished(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () =>
        reject(
          transaction.error ?? new Error("IndexedDB transaction aborted."),
        ),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () =>
        reject(transaction.error ?? new Error("IndexedDB transaction failed.")),
      { once: true },
    );
  });
}

function openRecoveryDatabase(databaseName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(databaseName, 1);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("records")) {
        database.createObjectStore("records", { keyPath: "recordKey" });
      }
      if (!database.objectStoreNames.contains("vault")) {
        database.createObjectStore("vault");
      }
    });
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("IndexedDB could not open.")),
      { once: true },
    );
  });
}

async function getOrCreateRecoveryKey(
  database: IDBDatabase,
  keyId: string,
): Promise<CryptoKey> {
  const readTransaction = database.transaction("vault", "readonly");
  const readFinished = transactionFinished(readTransaction);
  const existing = await requestResult(
    readTransaction.objectStore("vault").get(keyId) as IDBRequest<unknown>,
  );
  await readFinished;
  if (isStoredCryptoKey(existing)) return existing;

  const generated = await globalThis.crypto.subtle.generateKey(
    { length: 256, name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  const writeTransaction = database.transaction("vault", "readwrite");
  const writeFinished = transactionFinished(writeTransaction);
  const store = writeTransaction.objectStore("vault");
  const raced = await requestResult(store.get(keyId) as IDBRequest<unknown>);
  if (isStoredCryptoKey(raced)) {
    await writeFinished;
    return raced;
  }
  store.put(generated, keyId);
  await writeFinished;
  return generated;
}

function isStoredCryptoKey(value: unknown): value is CryptoKey {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "secret" &&
    "extractable" in value &&
    value.extractable === false
  );
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function additionalData(
  recordKey: string,
  revision: number,
  schemaVersion: number,
): ArrayBuffer {
  return toArrayBuffer(
    new TextEncoder().encode(
      `${recordKey}\u0000${revision}\u0000${schemaVersion}`,
    ),
  );
}

function classifyStorageFailure(error: unknown): CommitResult {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return { reason: "quota", status: "failed" };
  }
  return { reason: "unavailable", status: "failed" };
}

export function createIndexedDbTableStore<State>(
  options: IndexedDbTableStoreOptions,
): AtomicTableStore<State> {
  const schemaVersion = options.schemaVersion ?? 1;
  const databasePromise = openRecoveryDatabase(options.databaseName);
  const keyPromise = databasePromise.then((database) =>
    getOrCreateRecoveryKey(database, `table-key:${options.recordKey}`),
  );

  return {
    async commit(expectedRevision, next) {
      try {
        const [database, key] = await Promise.all([
          databasePromise,
          keyPromise,
        ]);
        const iv = new Uint8Array(12);
        globalThis.crypto.getRandomValues(iv);
        const plaintext = new TextEncoder().encode(JSON.stringify(next));
        const ciphertext = await globalThis.crypto.subtle.encrypt(
          {
            additionalData: additionalData(
              options.recordKey,
              next.revision,
              schemaVersion,
            ),
            iv,
            name: "AES-GCM",
          },
          key,
          toArrayBuffer(plaintext),
        );
        const transaction = database.transaction("records", "readwrite");
        const finished = transactionFinished(transaction);
        const store = transaction.objectStore("records");
        const existing = (await requestResult(store.get(options.recordKey))) as
          EncryptedRecord | undefined;
        const actualRevision = existing?.revision ?? 0;
        if (actualRevision !== expectedRevision) {
          await finished;
          return { actualRevision, status: "revision-conflict" };
        }
        const record: EncryptedRecord = {
          ciphertext,
          iv,
          recordKey: options.recordKey,
          revision: next.revision,
          schemaVersion,
        };
        store.put(record);
        await finished;
        return { status: "committed" };
      } catch (error) {
        return classifyStorageFailure(error);
      }
    },
    async load() {
      const [database, key] = await Promise.all([databasePromise, keyPromise]);
      const transaction = database.transaction("records", "readonly");
      const finished = transactionFinished(transaction);
      const record = (await requestResult(
        transaction.objectStore("records").get(options.recordKey),
      )) as EncryptedRecord | undefined;
      await finished;
      if (!record) return undefined;
      if (
        record.recordKey !== options.recordKey ||
        record.schemaVersion !== schemaVersion
      ) {
        throw new Error("The saved table uses an unsupported schema.");
      }
      const plaintext = await globalThis.crypto.subtle.decrypt(
        {
          additionalData: additionalData(
            record.recordKey,
            record.revision,
            record.schemaVersion,
          ),
          iv: record.iv,
          name: "AES-GCM",
        },
        key,
        record.ciphertext,
      );
      const parsed = JSON.parse(
        new TextDecoder().decode(plaintext),
      ) as VersionedRecord<State>;
      if (parsed.revision !== record.revision) {
        throw new Error(
          "The saved table revision failed integrity validation.",
        );
      }
      return structuredClone(parsed);
    },
    async remove() {
      const database = await databasePromise;
      const transaction = database.transaction(
        ["records", "vault"],
        "readwrite",
      );
      const finished = transactionFinished(transaction);
      transaction.objectStore("records").delete(options.recordKey);
      transaction.objectStore("vault").delete(`table-key:${options.recordKey}`);
      await finished;
    },
  };
}

export interface ExclusiveHostLease {
  readonly name: string;
  isHeld(): Promise<boolean>;
  release(): void;
}

interface IndexedDbLeaseRecord {
  readonly expiresAt: number;
  readonly name: string;
  readonly ownerId: string;
}

const fallbackLeaseDurationMs = 7_000;
const fallbackLeaseHeartbeatMs = 2_000;

function openLeaseDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open("html-poker-exclusive-host", 1);
    request.addEventListener("upgradeneeded", () => {
      if (!request.result.objectStoreNames.contains("leases")) {
        request.result.createObjectStore("leases", { keyPath: "name" });
      }
    });
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("Host lease storage failed.")),
      { once: true },
    );
  });
}

async function readLease(
  database: IDBDatabase,
  name: string,
): Promise<IndexedDbLeaseRecord | undefined> {
  const transaction = database.transaction("leases", "readonly");
  const finished = transactionFinished(transaction);
  const record = (await requestResult(
    transaction.objectStore("leases").get(name),
  )) as IndexedDbLeaseRecord | undefined;
  await finished;
  return record;
}

async function acquireIndexedDbHostLease(
  name: string,
): Promise<ExclusiveHostLease | undefined> {
  if (!("indexedDB" in globalThis)) return undefined;
  const database = await openLeaseDatabase();
  const ownerId = globalThis.crypto.randomUUID();
  const transaction = database.transaction("leases", "readwrite");
  const finished = transactionFinished(transaction);
  const store = transaction.objectStore("leases");
  const existing = (await requestResult(store.get(name))) as
    IndexedDbLeaseRecord | undefined;
  const now = Date.now();
  if (existing && existing.expiresAt > now) {
    await finished;
    database.close();
    return undefined;
  }
  store.put({
    expiresAt: now + fallbackLeaseDurationMs,
    name,
    ownerId,
  } satisfies IndexedDbLeaseRecord);
  await finished;

  let released = false;
  async function renew(): Promise<void> {
    if (released) return;
    const renewal = database.transaction("leases", "readwrite");
    const renewalFinished = transactionFinished(renewal);
    const renewalStore = renewal.objectStore("leases");
    const active = (await requestResult(renewalStore.get(name))) as
      IndexedDbLeaseRecord | undefined;
    if (
      !active ||
      active.ownerId !== ownerId ||
      active.expiresAt <= Date.now()
    ) {
      released = true;
      globalThis.clearInterval(heartbeat);
      await renewalFinished;
      return;
    }
    renewalStore.put({
      expiresAt: Date.now() + fallbackLeaseDurationMs,
      name,
      ownerId,
    } satisfies IndexedDbLeaseRecord);
    await renewalFinished;
  }
  const heartbeat = globalThis.setInterval(() => {
    void renew().catch(() => {
      released = true;
      globalThis.clearInterval(heartbeat);
    });
  }, fallbackLeaseHeartbeatMs);

  return {
    async isHeld() {
      if (released) return false;
      try {
        const active = await readLease(database, name);
        return Boolean(
          active && active.ownerId === ownerId && active.expiresAt > Date.now(),
        );
      } catch {
        return false;
      }
    },
    name,
    release() {
      if (released) return;
      released = true;
      globalThis.clearInterval(heartbeat);
      void (async () => {
        try {
          const removal = database.transaction("leases", "readwrite");
          const removalFinished = transactionFinished(removal);
          const removalStore = removal.objectStore("leases");
          const active = (await requestResult(removalStore.get(name))) as
            IndexedDbLeaseRecord | undefined;
          if (active?.ownerId === ownerId) removalStore.delete(name);
          await removalFinished;
        } finally {
          database.close();
        }
      })();
    },
  };
}

export async function acquireExclusiveHostLease(
  name: string,
): Promise<ExclusiveHostLease | undefined> {
  if (!("locks" in globalThis.navigator)) {
    return acquireIndexedDbHostLease(name);
  }
  let releaseLock: (() => void) | undefined;
  let resolveAcquisition:
    ((lease: ExclusiveHostLease | undefined) => void) | undefined;
  const acquisition = new Promise<ExclusiveHostLease | undefined>((resolve) => {
    resolveAcquisition = resolve;
  });
  const hold = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  void globalThis.navigator.locks.request(
    name,
    { ifAvailable: true, mode: "exclusive" },
    async (lock) => {
      if (!lock) {
        resolveAcquisition?.(undefined);
        return;
      }
      let released = false;
      resolveAcquisition?.({
        async isHeld() {
          return !released;
        },
        name,
        release() {
          if (released) return;
          released = true;
          releaseLock?.();
        },
      });
      await hold;
    },
  );
  return acquisition;
}
