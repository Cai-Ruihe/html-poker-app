import { describe, expect, it } from "vitest";

import { createCardCustody } from "@html-poker/card-custody";
import {
  createTrustedHostAuthority,
  type CommandEnvelope,
} from "@html-poker/game-core";
import { createMemoryTableStore } from "@html-poker/persistence";

function createCommand(): CommandEnvelope {
  return {
    actor: { actorId: "host-1", kind: "trusted-host" },
    authorityEpoch: "epoch-1",
    commandId: "command-create",
    expectedRevision: 0,
    payload: {
      dealerSeatId: "seat-a",
      seats: [
        { displayName: "Alice", seatId: "seat-a" },
        { displayName: "Bob", seatId: "seat-b" },
      ],
      type: "CreateTable",
    },
    tableId: "table-1",
  };
}

describe("Trusted Host command idempotency", () => {
  it("replays one committed receipt but rejects a changed command with the same ID", async () => {
    const authority = createTrustedHostAuthority({
      authorityEpoch: "epoch-1",
      custody: createCardCustody({ shuffler: (deck) => deck }),
      handIdFactory: () => "hand-1",
      store: createMemoryTableStore(),
      tableId: "table-1",
    });
    const command = createCommand();

    const first = await authority.submit(command);
    const retry = await authority.submit(command);
    expect(retry).toEqual(first);
    if (command.payload.type !== "CreateTable")
      throw new Error("Expected a create-table command.");

    const changed = await authority.submit({
      ...command,
      payload: {
        ...command.payload,
        dealerSeatId: "seat-b",
      },
    });
    expect(changed).toEqual({
      code: "idempotency-conflict",
      revision: 1,
      status: "rejected",
    });
  });

  it("returns the same receipt to concurrent callers with the same command ID", async () => {
    const authority = createTrustedHostAuthority({
      authorityEpoch: "epoch-1",
      custody: createCardCustody({ shuffler: (deck) => deck }),
      handIdFactory: () => "hand-1",
      store: createMemoryTableStore(),
      tableId: "table-1",
    });
    const command = createCommand();

    const [first, concurrentRetry] = await Promise.all([
      authority.submit(command),
      authority.submit(command),
    ]);

    expect(first).toMatchObject({ revision: 1, status: "accepted" });
    expect(concurrentRetry).toEqual(first);
  });
});
