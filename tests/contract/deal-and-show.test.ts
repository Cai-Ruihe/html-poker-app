import { describe, expect, it } from "vitest";

import {
  createCardCustody,
  type Card,
  type DeckShuffler,
} from "@html-poker/card-custody";
import { createTrustedHostAuthority } from "@html-poker/game-core";
import { createMemoryTableStore } from "@html-poker/persistence";

const allCards: Card[] = ["c", "d", "h", "s"].flatMap((suit) =>
  ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"].map(
    (rank) => `${rank}${suit}` as Card,
  ),
);

function stackedDeck(prefix: Card[]): DeckShuffler {
  return () => [
    ...prefix,
    ...allCards.filter((card) => !prefix.includes(card)),
  ];
}

describe("Deal-Only Profile through the Trusted Host interface", () => {
  it("deals private cards, reveals only commanded cards, and ends explicitly", async () => {
    const custody = createCardCustody({
      shuffler: stackedDeck([
        "As",
        "Kd",
        "Qh",
        "Jc",
        "9s",
        "2c",
        "3d",
        "4h",
        "8s",
        "5s",
        "7s",
        "6d",
      ]),
    });
    const authority = createTrustedHostAuthority({
      authorityEpoch: "epoch-1",
      custody,
      handIdFactory: () => "hand-001",
      store: createMemoryTableStore(),
      tableId: "table-001",
    });

    await expect(
      authority.submit({
        actor: { actorId: "host-1", kind: "trusted-host" },
        authorityEpoch: "epoch-1",
        commandId: "command-create",
        expectedRevision: 0,
        payload: {
          dealerSeatId: "seat-alice",
          seats: [
            { displayName: "Alice", seatId: "seat-alice" },
            { displayName: "Bob", seatId: "seat-bob" },
          ],
          type: "CreateTable",
        },
        tableId: "table-001",
      }),
    ).resolves.toMatchObject({ status: "accepted", revision: 1 });

    await expect(
      authority.submit({
        actor: { actorId: "host-1", kind: "trusted-host" },
        authorityEpoch: "epoch-1",
        commandId: "command-deal",
        expectedRevision: 1,
        payload: { type: "StartHand" },
        tableId: "table-001",
      }),
    ).resolves.toMatchObject({
      events: [{ type: "HandStarted" }],
      handId: "hand-001",
      revision: 2,
      status: "accepted",
    });

    const publicBeforeFlop = authority.project({ kind: "public" });
    expect(publicBeforeFlop).toMatchObject({
      board: [],
      phase: "preflop",
      revision: 2,
      view: "public",
    });
    expect(JSON.stringify(publicBeforeFlop)).not.toContain("As");
    expect(JSON.stringify(publicBeforeFlop)).not.toContain("Kd");
    expect(JSON.stringify(publicBeforeFlop)).not.toContain("Qh");
    expect(JSON.stringify(publicBeforeFlop)).not.toContain("Jc");

    expect(
      authority.project({ kind: "seat", seatId: "seat-alice" }),
    ).toMatchObject({
      self: { holeCards: ["As", "Qh"], seatId: "seat-alice" },
      view: "seat",
    });
    const bobProjection = authority.project({
      kind: "seat",
      seatId: "seat-bob",
    });
    expect(bobProjection).toMatchObject({
      self: { holeCards: ["Kd", "Jc"], seatId: "seat-bob" },
      view: "seat",
    });
    expect(JSON.stringify(bobProjection)).not.toContain("As");
    expect(JSON.stringify(bobProjection)).not.toContain("Qh");

    await expect(
      authority.submit({
        actor: { actorId: "host-1", kind: "trusted-host" },
        authorityEpoch: "epoch-1",
        commandId: "command-flop",
        expectedRevision: 2,
        handId: "hand-001",
        payload: { street: "flop", type: "RevealStreet" },
        tableId: "table-001",
      }),
    ).resolves.toMatchObject({ revision: 3, status: "accepted" });
    expect(authority.project({ kind: "public" })).toMatchObject({
      board: ["2c", "3d", "4h"],
      phase: "flop",
    });

    await expect(
      authority.submit({
        actor: { kind: "seat", seatId: "seat-alice" },
        authorityEpoch: "epoch-1",
        commandId: "command-show-alice",
        expectedRevision: 3,
        handId: "hand-001",
        payload: { type: "ShowCards" },
        tableId: "table-001",
      }),
    ).resolves.toMatchObject({ revision: 4, status: "accepted" });
    expect(authority.project({ kind: "public" }).seats).toContainEqual(
      expect.objectContaining({
        holeCards: ["As", "Qh"],
        seatId: "seat-alice",
        status: "shown",
      }),
    );

    const end = await authority.submit({
      actor: { actorId: "host-1", kind: "trusted-host" },
      authorityEpoch: "epoch-1",
      commandId: "command-end",
      expectedRevision: 4,
      handId: "hand-001",
      payload: { type: "EndHand" },
      tableId: "table-001",
    });
    expect(end).toMatchObject({ revision: 5, status: "accepted" });
    expect(authority.project({ kind: "public" })).toMatchObject({
      phase: "complete",
    });
  });
});
