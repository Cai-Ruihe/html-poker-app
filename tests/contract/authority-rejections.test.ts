import { describe, expect, it } from "vitest";

import { createCardCustody, type Card } from "@html-poker/card-custody";
import {
  createTrustedHostAuthority,
  type CommandEnvelope,
} from "@html-poker/game-core";
import { createMemoryTableStore } from "@html-poker/persistence";

const orderedDeck = ["c", "d", "h", "s"].flatMap((suit) =>
  ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"].map(
    (rank) => `${rank}${suit}` as Card,
  ),
);

function makeAuthority(tableId = "table-1") {
  return createTrustedHostAuthority({
    authorityEpoch: "epoch-1",
    custody: createCardCustody({ shuffler: () => orderedDeck }),
    handIdFactory: () => "hand-1",
    store: createMemoryTableStore(),
    tableId,
  });
}

function hostCommand(
  commandId: string,
  expectedRevision: number,
  payload: CommandEnvelope["payload"],
  extra: Partial<CommandEnvelope> = {},
): CommandEnvelope {
  return {
    actor: { actorId: "host-1", kind: "trusted-host" },
    authorityEpoch: "epoch-1",
    commandId,
    expectedRevision,
    payload,
    tableId: "table-1",
    ...extra,
  };
}

const createPayload = {
  dealerSeatId: "seat-a",
  seats: [
    { displayName: "Alice", seatId: "seat-a" },
    { displayName: "Bob", seatId: "seat-b" },
  ],
  type: "CreateTable",
} as const;

describe("Trusted Host command rejection contracts", () => {
  it("rejects the wrong table, epoch, actor, revision, and invalid table shape", async () => {
    const authority = makeAuthority();

    await expect(
      authority.submit(
        hostCommand("wrong-table", 0, createPayload, { tableId: "other" }),
      ),
    ).resolves.toMatchObject({ code: "table-mismatch", status: "rejected" });
    await expect(
      authority.submit(
        hostCommand("wrong-epoch", 0, createPayload, {
          authorityEpoch: "other",
        }),
      ),
    ).resolves.toMatchObject({
      code: "authority-mismatch",
      status: "rejected",
    });
    await expect(
      authority.submit(
        hostCommand("seat-create", 0, createPayload, {
          actor: { kind: "seat", seatId: "seat-a" },
        }),
      ),
    ).resolves.toMatchObject({
      code: "command-not-allowed",
      status: "rejected",
    });
    await expect(
      authority.submit(
        hostCommand("bad-dealer", 0, {
          ...createPayload,
          dealerSeatId: "missing",
        }),
      ),
    ).resolves.toMatchObject({
      code: "command-not-allowed",
      status: "rejected",
    });

    await authority.submit(hostCommand("create", 0, createPayload));
    await expect(
      authority.submit(hostCommand("stale", 0, { type: "StartHand" })),
    ).resolves.toEqual({
      code: "revision-conflict",
      revision: 1,
      status: "rejected",
    });
    await expect(
      authority.submit(hostCommand("create-again", 1, createPayload)),
    ).resolves.toMatchObject({
      code: "command-not-allowed",
      status: "rejected",
    });
  });

  it("enforces actor, hand, and street legality through hand completion", async () => {
    const authority = makeAuthority();
    await authority.submit(hostCommand("create", 0, createPayload));
    await expect(
      authority.submit(
        hostCommand(
          "seat-start",
          1,
          { type: "StartHand" },
          {
            actor: { kind: "seat", seatId: "seat-a" },
          },
        ),
      ),
    ).resolves.toMatchObject({
      code: "command-not-allowed",
      status: "rejected",
    });
    await authority.submit(hostCommand("start", 1, { type: "StartHand" }));

    await expect(
      authority.submit(
        hostCommand(
          "turn-too-early",
          2,
          { street: "turn", type: "RevealStreet" },
          { handId: "hand-1" },
        ),
      ),
    ).resolves.toMatchObject({
      code: "command-not-allowed",
      status: "rejected",
    });
    await expect(
      authority.submit(
        hostCommand(
          "wrong-hand",
          2,
          { street: "flop", type: "RevealStreet" },
          { handId: "other-hand" },
        ),
      ),
    ).resolves.toMatchObject({ code: "hand-mismatch", status: "rejected" });
    await expect(
      authority.submit(
        hostCommand(
          "host-show",
          2,
          { type: "ShowCards" },
          {
            handId: "hand-1",
          },
        ),
      ),
    ).resolves.toMatchObject({
      code: "command-not-allowed",
      status: "rejected",
    });
    await expect(
      authority.submit(
        hostCommand(
          "missing-seat-show",
          2,
          { type: "ShowCards" },
          {
            actor: { kind: "seat", seatId: "missing" },
            handId: "hand-1",
          },
        ),
      ),
    ).resolves.toMatchObject({
      code: "command-not-allowed",
      status: "rejected",
    });

    await authority.submit(
      hostCommand(
        "flop",
        2,
        { street: "flop", type: "RevealStreet" },
        { handId: "hand-1" },
      ),
    );
    await authority.submit(
      hostCommand(
        "turn",
        3,
        { street: "turn", type: "RevealStreet" },
        { handId: "hand-1" },
      ),
    );
    await authority.submit(
      hostCommand(
        "river",
        4,
        { street: "river", type: "RevealStreet" },
        { handId: "hand-1" },
      ),
    );
    await expect(
      authority.submit(
        hostCommand(
          "seat-end",
          5,
          { type: "EndHand" },
          {
            actor: { kind: "seat", seatId: "seat-a" },
            handId: "hand-1",
          },
        ),
      ),
    ).resolves.toMatchObject({
      code: "command-not-allowed",
      status: "rejected",
    });
    await authority.submit(
      hostCommand("end", 5, { type: "EndHand" }, { handId: "hand-1" }),
    );
    await expect(
      authority.submit(
        hostCommand(
          "end-again",
          6,
          { type: "EndHand" },
          {
            handId: "hand-1",
          },
        ),
      ),
    ).resolves.toMatchObject({
      code: "command-not-allowed",
      status: "rejected",
    });
    await expect(
      authority.submit(hostCommand("next", 6, { type: "StartHand" })),
    ).resolves.toMatchObject({ revision: 7, status: "accepted" });
  });

  it("surfaces a store compare-and-swap conflict without changing memory", async () => {
    const authority = createTrustedHostAuthority({
      authorityEpoch: "epoch-1",
      custody: createCardCustody({ shuffler: () => orderedDeck }),
      handIdFactory: () => "hand-1",
      store: {
        async commit() {
          return { actualRevision: 1, status: "revision-conflict" } as const;
        },
        async load() {
          return undefined;
        },
      },
      tableId: "table-1",
    });

    await expect(
      authority.submit(hostCommand("create", 0, createPayload)),
    ).resolves.toEqual({
      code: "revision-conflict",
      revision: 1,
      status: "rejected",
    });
    expect(() => authority.project({ kind: "public" })).toThrow(
      "The table has not been created.",
    );
  });
});
