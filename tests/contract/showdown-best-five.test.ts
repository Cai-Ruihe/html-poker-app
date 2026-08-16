import { describe, expect, it } from "vitest";

import type { Card } from "@html-poker/card-custody";
import { evaluateTexasHoldem } from "@html-poker/game-core";

describe("showdown best-five evidence", () => {
  it("returns the exact five cards that form the winning evaluation", () => {
    const evaluation = evaluateTexasHoldem([
      "Ah",
      "Ad",
      "Ac",
      "Kd",
      "Ks",
      "2c",
      "3d",
    ] satisfies readonly Card[]);

    expect(evaluation).toMatchObject({
      category: "full-house",
      label: "Full house",
    });
    expect(new Set(evaluation?.bestFive)).toEqual(
      new Set<Card>(["Ah", "Ad", "Ac", "Kd", "Ks"]),
    );
  });

  it("marks board cards when the shared board itself is the best hand", () => {
    const evaluation = evaluateTexasHoldem([
      "Ah",
      "Kh",
      "Qh",
      "Jh",
      "Th",
      "2c",
      "3d",
    ] satisfies readonly Card[]);

    expect(evaluation).toMatchObject({
      category: "straight-flush",
      label: "Straight flush",
    });
    expect(evaluation?.bestFive).toEqual(["Ah", "Kh", "Qh", "Jh", "Th"]);
  });
});
