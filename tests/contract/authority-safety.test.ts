import { describe, expect, it } from "vitest";

import { createCardCustody, type Card } from "@html-poker/card-custody";
import {
  createTrustedHostAuthority,
  type CommandEnvelope,
  type TrustedHostAuthority,
} from "@html-poker/game-core";
import { createMemoryTableStore } from "@html-poker/persistence";

const orderedDeck = ["c", "d", "h", "s"].flatMap((suit) =>
  ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"].map(
    (rank) => `${rank}${suit}` as Card,
  ),
);

function createAuthority(): TrustedHostAuthority {
  return createTrustedHostAuthority({
    authorityEpoch: "epoch-1",
    custody: createCardCustody({ shuffler: () => orderedDeck }),
    handIdFactory: () => "hand-1",
    store: createMemoryTableStore(),
    tableId: "table-1",
  });
}

function command(
  commandId: string,
  expectedRevision: number,
  payload: CommandEnvelope["payload"],
  options: {
    readonly actor?: CommandEnvelope["actor"];
    readonly handId?: string;
  } = {},
): CommandEnvelope {
  return {
    actor: options.actor ?? {
      actorId: "host-1",
      kind: "trusted-host",
    },
    authorityEpoch: "epoch-1",
    commandId,
    expectedRevision,
    ...(options.handId ? { handId: options.handId } : {}),
    payload,
    tableId: "table-1",
  };
}

async function createAndStart(authority: TrustedHostAuthority): Promise<void> {
  await authority.submit(
    command("create", 0, {
      dealerSeatId: "seat-a",
      seats: [
        { displayName: "Alice", seatId: "seat-a" },
        { displayName: "Bob", seatId: "seat-b" },
      ],
      type: "CreateTable",
    }),
  );
  await authority.submit(command("start", 1, { type: "StartHand" }));
}

describe("Trusted Host authority safety boundaries", () => {
  it("does not let a projection caller mutate authoritative hidden or public cards", async () => {
    const authority = createAuthority();
    await createAndStart(authority);

    const seatProjection = authority.project({
      kind: "seat",
      seatId: "seat-a",
    });
    if (seatProjection.view !== "seat")
      throw new Error("Expected a seat view.");
    (seatProjection.self.holeCards as Card[])[0] = "As";

    expect(authority.project({ kind: "seat", seatId: "seat-a" })).toMatchObject(
      { self: { holeCards: ["2c", "4c"] } },
    );

    await authority.submit(
      command(
        "flop",
        2,
        { street: "flop", type: "RevealStreet" },
        {
          handId: "hand-1",
        },
      ),
    );
    const publicProjection = authority.project({ kind: "public" });
    (publicProjection.board as Card[])[0] = "Ks";

    expect(authority.project({ kind: "public" }).board).toEqual([
      "7c",
      "8c",
      "9c",
    ]);
  });

  it("rejects a hand-scoped command when the active Hand ID is omitted", async () => {
    const authority = createAuthority();
    await createAndStart(authority);

    await expect(
      authority.submit(
        command("flop-without-hand", 2, {
          street: "flop",
          type: "RevealStreet",
        }),
      ),
    ).resolves.toEqual({
      code: "hand-mismatch",
      revision: 2,
      status: "rejected",
    });
  });

  it("rejects ShowCards after the hand is complete", async () => {
    const authority = createAuthority();
    await createAndStart(authority);
    await authority.submit(
      command("end", 2, { type: "EndHand" }, { handId: "hand-1" }),
    );

    await expect(
      authority.submit(
        command(
          "late-show",
          3,
          { type: "ShowCards" },
          {
            actor: { kind: "seat", seatId: "seat-a" },
            handId: "hand-1",
          },
        ),
      ),
    ).resolves.toEqual({
      code: "command-not-allowed",
      revision: 3,
      status: "rejected",
    });
  });

  it("converts a thrown store failure into a typed fail-closed rejection", async () => {
    const authority = createTrustedHostAuthority({
      authorityEpoch: "epoch-1",
      custody: createCardCustody({ shuffler: () => orderedDeck }),
      handIdFactory: () => "hand-1",
      store: {
        async commit() {
          throw new Error("simulated storage failure");
        },
        async load() {
          return undefined;
        },
      },
      tableId: "table-1",
    });

    await expect(
      authority.submit(
        command("create", 0, {
          dealerSeatId: "seat-a",
          seats: [
            { displayName: "Alice", seatId: "seat-a" },
            { displayName: "Bob", seatId: "seat-b" },
          ],
          type: "CreateTable",
        }),
      ),
    ).resolves.toEqual({
      code: "persistence-failed",
      revision: 0,
      status: "rejected",
    });
  });
});
