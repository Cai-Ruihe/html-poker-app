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
  };
}
