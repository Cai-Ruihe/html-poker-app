import { describe, expect, it } from "vitest";

import { createCardCustody } from "@html-poker/card-custody";
import {
  createTrustedHostAuthority,
  type CommandEnvelope,
  type PersistedAuthorityState,
} from "@html-poker/game-core";
import {
  createMemoryTableStore,
  type AtomicTableStore,
  type VersionedRecord,
} from "@html-poker/persistence";

function hostCommand(
  commandId: string,
  expectedRevision: number,
  payload: CommandEnvelope["payload"],
  handId?: string,
): CommandEnvelope {
  return {
    actor: { actorId: "host-1", kind: "trusted-host" },
    authorityEpoch: "epoch-1",
    commandId,
    expectedRevision,
    ...(handId ? { handId } : {}),
    payload,
    tableId: "table-1",
  };
}

describe("same-browser Trusted Host recovery", () => {
  it("loads the last committed authority state and preserves idempotency", async () => {
    const store = createMemoryTableStore<PersistedAuthorityState>();
    const first = createTrustedHostAuthority({
      authorityEpoch: "epoch-1",
      custody: createCardCustody({ shuffler: (deck) => deck }),
      handIdFactory: () => "hand-1",
      store,
      tableId: "table-1",
    });
    const create = hostCommand("create", 0, {
      dealerSeatId: "seat-a",
      seats: [
        { displayName: "Alice", seatId: "seat-a" },
        { displayName: "Bob", seatId: "seat-b" },
      ],
      type: "CreateTable",
    });
    const createReceipt = await first.submit(create);
    await first.submit(hostCommand("start", 1, { type: "StartHand" }));

    const recovered = createTrustedHostAuthority({
      authorityEpoch: "epoch-1",
      custody: createCardCustody({ shuffler: (deck) => deck }),
      handIdFactory: () => "hand-2",
      store,
      tableId: "table-1",
    });
    await expect(recovered.recover()).resolves.toEqual({
      revision: 2,
      status: "recovered",
    });
    expect(recovered.project({ kind: "public" })).toMatchObject({
      handId: "hand-1",
      phase: "preflop",
      revision: 2,
    });
    await expect(recovered.submit(create)).resolves.toEqual(createReceipt);
    await expect(
      recovered.submit(
        hostCommand(
          "flop",
          2,
          { street: "flop", type: "RevealStreet" },
          "hand-1",
        ),
      ),
    ).resolves.toMatchObject({ revision: 3, status: "accepted" });
  });

  it("fails closed when revision, table, or authority metadata is inconsistent", async () => {
    let saved: VersionedRecord<PersistedAuthorityState> | undefined;
    const corruptStore: AtomicTableStore<PersistedAuthorityState> = {
      async commit(_expectedRevision, next) {
        saved = structuredClone(next);
        return { status: "committed" };
      },
      async load() {
        if (!saved) return undefined;
        return {
          revision: saved.revision + 1,
          state: structuredClone(saved.state),
        };
      },
    };
    const first = createTrustedHostAuthority({
      authorityEpoch: "epoch-1",
      custody: createCardCustody({ shuffler: (deck) => deck }),
      handIdFactory: () => "hand-1",
      store: corruptStore,
      tableId: "table-1",
    });
    await first.submit(
      hostCommand("create", 0, {
        dealerSeatId: "seat-a",
        seats: [
          { displayName: "Alice", seatId: "seat-a" },
          { displayName: "Bob", seatId: "seat-b" },
        ],
        type: "CreateTable",
      }),
    );

    const recovered = createTrustedHostAuthority({
      authorityEpoch: "epoch-1",
      custody: createCardCustody({ shuffler: (deck) => deck }),
      handIdFactory: () => "hand-2",
      store: corruptStore,
      tableId: "table-1",
    });
    await expect(recovered.recover()).resolves.toEqual({
      code: "corrupt-state",
      status: "rejected",
    });
    expect(() => recovered.project({ kind: "public" })).toThrow(
      "not been created",
    );
  });
});
