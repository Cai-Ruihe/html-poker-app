import { describe, expect, it } from "vitest";

import {
  createCardCustody,
  type Card,
  type DeckShuffler,
} from "@html-poker/card-custody";

const orderedDeck: Card[] = ["c", "d", "h", "s"].flatMap((suit) =>
  ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"].map(
    (rank) => `${rank}${suit}` as Card,
  ),
);

describe("Card Custody", () => {
  it("uses the secure shuffle path and deals two unique cards per seat", () => {
    const custody = createCardCustody();
    const state = custody.startHand(["seat-a", "seat-b"]);
    const seatA = custody.seatCards(state, "seat-a");
    const seatB = custody.seatCards(state, "seat-b");

    expect(seatA).toHaveLength(2);
    expect(seatB).toHaveLength(2);
    expect(new Set([...(seatA ?? []), ...(seatB ?? [])]).size).toBe(4);
    expect(custody.boardCards(state)).toEqual([]);
  });

  it("deals the Phase 1 maximum of ten seats", () => {
    const seats = Array.from({ length: 10 }, (_, index) => `seat-${index}`);
    const custody = createCardCustody({ shuffler: () => orderedDeck });
    const state = custody.startHand(seats);

    const dealtCards = seats.flatMap(
      (seatId) => custody.seatCards(state, seatId) ?? [],
    );
    expect(dealtCards).toHaveLength(20);
    expect(new Set(dealtCards).size).toBe(20);
  });

  it("burns before each street and exposes only explicitly shown seats", () => {
    const custody = createCardCustody({ shuffler: () => orderedDeck });
    const preflop = custody.startHand(["seat-a", "seat-b"]);
    const flop = custody.revealStreet(preflop, "flop");
    const turn = custody.revealStreet(flop, "turn");
    const river = custody.revealStreet(turn, "river");

    expect(custody.boardCards(flop)).toEqual(["7c", "8c", "9c"]);
    expect(custody.boardCards(turn)).toEqual(["7c", "8c", "9c", "Jc"]);
    expect(custody.boardCards(river)).toEqual(["7c", "8c", "9c", "Jc", "Kc"]);
    expect(custody.seatCards(preflop, "missing")).toBeUndefined();
    expect(custody.shownCards(preflop)).toEqual({});

    const shown = custody.showSeat(preflop, "seat-a");
    expect(custody.shownCards(shown)).toEqual({
      "seat-a": ["2c", "4c"],
    });
    expect(custody.showSeat(shown, "seat-a")).toBe(shown);
    expect(() => custody.showSeat(preflop, "missing")).toThrow(
      "Cannot show cards for a seat outside this hand.",
    );
  });

  it.each([
    { seats: ["seat-a"], title: "too few seats" },
    {
      seats: Array.from({ length: 11 }, (_, index) => `seat-${index}`),
      title: "too many seats",
    },
    { seats: ["seat-a", "seat-a"], title: "duplicate seat IDs" },
  ])("rejects $title", ({ seats }) => {
    expect(() =>
      createCardCustody({ shuffler: () => orderedDeck }).startHand(seats),
    ).toThrow();
  });

  it.each([
    {
      shuffler: (() => orderedDeck.slice(0, 51)) satisfies DeckShuffler,
      title: "a short deck",
    },
    {
      shuffler: (() => [
        ...orderedDeck.slice(0, 51),
        orderedDeck[0] as Card,
      ]) satisfies DeckShuffler,
      title: "a duplicate card",
    },
    {
      shuffler: (() => [
        ...orderedDeck.slice(0, 51),
        "1x" as Card,
      ]) satisfies DeckShuffler,
      title: "an unknown card",
    },
  ])("rejects a shuffled deck containing $title", ({ shuffler }) => {
    expect(() =>
      createCardCustody({ shuffler }).startHand(["seat-a", "seat-b"]),
    ).toThrow(/shuffled deck/);
  });
});
