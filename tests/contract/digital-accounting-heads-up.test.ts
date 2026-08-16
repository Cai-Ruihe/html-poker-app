import { describe, expect, test } from "vitest";

import {
  createDigitalAccounting,
  type AccountingState,
} from "@html-poker/accounting";

function acceptedState(
  result: ReturnType<ReturnType<typeof createDigitalAccounting>["submit"]>,
): AccountingState {
  expect(result.status).toBe("accepted");
  if (result.status !== "accepted") throw new Error(result.code);
  return result.state;
}

describe("digital accounting heads-up profile", () => {
  test("posts heads-up blinds and exposes the exact first legal actions", () => {
    const accounting = createDigitalAccounting({
      bigBlind: 2,
      housePolicyId: "p2-house-1",
      smallBlind: 1,
    });
    const session = acceptedState(
      accounting.submit(undefined, {
        seats: [
          { seatId: "alice", stack: 100 },
          { seatId: "bob", stack: 100 },
        ],
        type: "CreateSession",
      }),
    );

    const hand = acceptedState(
      accounting.submit(session, {
        activeSeatIds: ["alice", "bob"],
        dealerSeatId: "alice",
        handId: "hand-1",
        type: "StartHand",
      }),
    );

    expect(accounting.project(hand)).toMatchObject({
      currentActorSeatId: "alice",
      currentBet: 2,
      handId: "hand-1",
      phase: "betting",
      potTotal: 3,
      sessionTotal: 200,
      seats: [
        {
          seatId: "alice",
          stack: 99,
          status: "active",
          streetContribution: 1,
          totalContribution: 1,
        },
        {
          seatId: "bob",
          stack: 98,
          status: "active",
          streetContribution: 2,
          totalContribution: 2,
        },
      ],
      street: "preflop",
    });
    expect(accounting.legalActions(hand, "alice")).toEqual([
      { type: "fold" },
      { amount: 1, type: "call" },
      { maxTo: 100, minTo: 4, type: "raise-to" },
      { to: 100, type: "all-in" },
    ]);
    expect(accounting.legalActions(hand, "bob")).toEqual([]);
  });

  test("moves to the flop only after both players complete preflop action", () => {
    const accounting = createDigitalAccounting({
      bigBlind: 2,
      housePolicyId: "p2-house-1",
      smallBlind: 1,
    });
    const session = acceptedState(
      accounting.submit(undefined, {
        seats: [
          { seatId: "alice", stack: 100 },
          { seatId: "bob", stack: 100 },
        ],
        type: "CreateSession",
      }),
    );
    const hand = acceptedState(
      accounting.submit(session, {
        activeSeatIds: ["alice", "bob"],
        dealerSeatId: "alice",
        handId: "hand-1",
        type: "StartHand",
      }),
    );

    const called = accounting.submit(hand, {
      seatId: "alice",
      type: "Call",
    });
    expect(called.status).toBe("accepted");
    if (called.status !== "accepted") throw new Error(called.code);
    expect(called.events).toEqual([
      {
        action: "call",
        amount: 1,
        seatId: "alice",
        type: "BettingActionCommitted",
      },
    ]);
    expect(accounting.project(called.state)).toMatchObject({
      currentActorSeatId: "bob",
      currentBet: 2,
      potTotal: 4,
      street: "preflop",
    });

    const checked = accounting.submit(called.state, {
      seatId: "bob",
      type: "Check",
    });
    expect(checked.status).toBe("accepted");
    if (checked.status !== "accepted") throw new Error(checked.code);
    expect(checked.events).toEqual([
      {
        action: "check",
        amount: 0,
        seatId: "bob",
        type: "BettingActionCommitted",
      },
      { street: "preflop", type: "BettingRoundClosed" },
      { street: "flop", type: "AccountingStreetStarted" },
    ]);
    expect(accounting.project(checked.state)).toMatchObject({
      currentActorSeatId: "bob",
      currentBet: 0,
      potTotal: 4,
      seats: [
        {
          seatId: "alice",
          stack: 98,
          streetContribution: 0,
          totalContribution: 2,
        },
        {
          seatId: "bob",
          stack: 98,
          streetContribution: 0,
          totalContribution: 2,
        },
      ],
      street: "flop",
    });
  });

  test("keeps balances unchanged until the host confirms settlement", () => {
    const accounting = createDigitalAccounting({
      bigBlind: 2,
      housePolicyId: "p2-house-1",
      smallBlind: 1,
    });
    let state = acceptedState(
      accounting.submit(undefined, {
        seats: [
          { seatId: "alice", stack: 100 },
          { seatId: "bob", stack: 100 },
        ],
        type: "CreateSession",
      }),
    );
    state = acceptedState(
      accounting.submit(state, {
        activeSeatIds: ["alice", "bob"],
        dealerSeatId: "alice",
        handId: "hand-1",
        type: "StartHand",
      }),
    );
    state = acceptedState(
      accounting.submit(state, { seatId: "alice", type: "Call" }),
    );
    state = acceptedState(
      accounting.submit(state, { seatId: "bob", type: "Check" }),
    );
    for (const seatId of ["bob", "alice", "bob", "alice", "bob", "alice"]) {
      state = acceptedState(
        accounting.submit(state, { seatId, type: "Check" }),
      );
    }

    expect(accounting.project(state)).toMatchObject({
      phase: "showdown",
      potTotal: 4,
      seats: [
        { seatId: "alice", stack: 98 },
        { seatId: "bob", stack: 98 },
      ],
      street: "river",
    });

    const proposed = accounting.submit(state, {
      explanations: ["Alice wins with a pair of aces."],
      type: "ProposeSettlement",
      winnersByPot: [["alice"]],
    });
    expect(proposed.status).toBe("accepted");
    if (proposed.status !== "accepted") throw new Error(proposed.code);
    expect(accounting.project(proposed.state)).toMatchObject({
      phase: "settlement-pending",
      potTotal: 4,
      seats: [
        { seatId: "alice", stack: 98 },
        { seatId: "bob", stack: 98 },
      ],
      settlement: {
        pots: [
          {
            amount: 4,
            awards: [{ amount: 4, seatId: "alice" }],
            eligibleSeatIds: ["alice", "bob"],
            explanation: "Alice wins with a pair of aces.",
            winnerSeatIds: ["alice"],
          },
        ],
        totalPot: 4,
      },
    });

    const confirmed = accounting.submit(proposed.state, {
      type: "ConfirmSettlement",
    });
    expect(confirmed.status).toBe("accepted");
    if (confirmed.status !== "accepted") throw new Error(confirmed.code);
    expect(accounting.project(confirmed.state)).toMatchObject({
      phase: "complete",
      potTotal: 0,
      seats: [
        { seatId: "alice", stack: 102 },
        { seatId: "bob", stack: 98 },
      ],
    });
  });

  test("commits a full raise and updates the opponent's exact envelope", () => {
    const accounting = createDigitalAccounting({
      bigBlind: 2,
      housePolicyId: "p2-house-1",
      smallBlind: 1,
    });
    let state = acceptedState(
      accounting.submit(undefined, {
        seats: [
          { seatId: "alice", stack: 100 },
          { seatId: "bob", stack: 100 },
        ],
        type: "CreateSession",
      }),
    );
    state = acceptedState(
      accounting.submit(state, {
        activeSeatIds: ["alice", "bob"],
        dealerSeatId: "alice",
        handId: "hand-1",
        type: "StartHand",
      }),
    );

    const raised = accounting.submit(state, {
      seatId: "alice",
      to: 6,
      type: "BetOrRaiseTo",
    });
    expect(raised.status).toBe("accepted");
    if (raised.status !== "accepted") throw new Error(raised.code);
    expect(raised.events).toEqual([
      {
        action: "raise",
        amount: 5,
        seatId: "alice",
        to: 6,
        type: "BettingActionCommitted",
      },
    ]);
    expect(accounting.project(raised.state)).toMatchObject({
      currentActorSeatId: "bob",
      currentBet: 6,
      potTotal: 8,
    });
    expect(accounting.legalActions(raised.state, "bob")).toEqual([
      { type: "fold" },
      { amount: 4, type: "call" },
      { maxTo: 100, minTo: 10, type: "raise-to" },
      { to: 100, type: "all-in" },
    ]);

    const called = accounting.submit(raised.state, {
      seatId: "bob",
      type: "Call",
    });
    expect(called.status).toBe("accepted");
    if (called.status !== "accepted") throw new Error(called.code);
    expect(accounting.project(called.state)).toMatchObject({
      currentActorSeatId: "bob",
      currentBet: 0,
      potTotal: 12,
      seats: [
        { seatId: "alice", stack: 94, totalContribution: 6 },
        { seatId: "bob", stack: 94, totalContribution: 6 },
      ],
      street: "flop",
    });
  });

  test("a fold enters settlement review without moving chips", () => {
    const accounting = createDigitalAccounting({
      bigBlind: 2,
      housePolicyId: "p2-house-1",
      smallBlind: 1,
    });
    let state = acceptedState(
      accounting.submit(undefined, {
        seats: [
          { seatId: "alice", stack: 100 },
          { seatId: "bob", stack: 100 },
        ],
        type: "CreateSession",
      }),
    );
    state = acceptedState(
      accounting.submit(state, {
        activeSeatIds: ["alice", "bob"],
        dealerSeatId: "alice",
        handId: "hand-1",
        type: "StartHand",
      }),
    );

    const folded = accounting.submit(state, {
      seatId: "alice",
      type: "Fold",
    });
    expect(folded.status).toBe("accepted");
    if (folded.status !== "accepted") throw new Error(folded.code);
    expect(accounting.project(folded.state)).toMatchObject({
      phase: "showdown",
      potTotal: 3,
      seats: [
        { seatId: "alice", stack: 99, status: "folded" },
        { seatId: "bob", stack: 98, status: "active" },
      ],
    });

    state = acceptedState(
      accounting.submit(folded.state, {
        explanations: ["Bob wins after Alice folds."],
        type: "ProposeSettlement",
        winnersByPot: [["bob"]],
      }),
    );
    expect(accounting.project(state)).toMatchObject({
      phase: "settlement-pending",
      settlement: {
        pots: [
          {
            amount: 3,
            eligibleSeatIds: ["bob"],
            winnerSeatIds: ["bob"],
          },
        ],
        totalPot: 3,
      },
    });
    state = acceptedState(
      accounting.submit(state, { type: "ConfirmSettlement" }),
    );
    expect(accounting.project(state)).toMatchObject({
      phase: "complete",
      seats: [
        { seatId: "alice", stack: 99 },
        { seatId: "bob", stack: 101 },
      ],
    });
  });

  test("awards an odd split chip clockwise from the dealer button", () => {
    const accounting = createDigitalAccounting({
      bigBlind: 2,
      housePolicyId: "p2-house-1",
      smallBlind: 1,
    });
    let state = acceptedState(
      accounting.submit(undefined, {
        seats: [
          { seatId: "alice", stack: 1 },
          { seatId: "bob", stack: 100 },
          { seatId: "charlie", stack: 100 },
        ],
        type: "CreateSession",
      }),
    );
    state = acceptedState(
      accounting.submit(state, {
        activeSeatIds: ["alice", "bob", "charlie"],
        dealerSeatId: "alice",
        handId: "hand-1",
        type: "StartHand",
      }),
    );
    state = acceptedState(
      accounting.submit(state, { seatId: "alice", type: "Call" }),
    );
    state = acceptedState(
      accounting.submit(state, { seatId: "bob", type: "Call" }),
    );
    state = acceptedState(
      accounting.submit(state, { seatId: "charlie", type: "Check" }),
    );
    for (const seatId of [
      "bob",
      "charlie",
      "bob",
      "charlie",
      "bob",
      "charlie",
    ]) {
      state = acceptedState(
        accounting.submit(state, { seatId, type: "Check" }),
      );
    }

    state = acceptedState(
      accounting.submit(state, {
        explanations: [
          "Bob and Charlie split the main pot.",
          "Bob and Charlie split the side pot.",
        ],
        type: "ProposeSettlement",
        winnersByPot: [
          ["bob", "charlie"],
          ["bob", "charlie"],
        ],
      }),
    );
    expect(accounting.project(state).settlement).toMatchObject({
      pots: [
        {
          amount: 3,
          awards: [
            { amount: 2, seatId: "bob" },
            { amount: 1, seatId: "charlie" },
          ],
        },
        {
          amount: 2,
          awards: [
            { amount: 1, seatId: "bob" },
            { amount: 1, seatId: "charlie" },
          ],
        },
      ],
      totalPot: 5,
    });

    state = acceptedState(
      accounting.submit(state, { type: "ConfirmSettlement" }),
    );
    expect(accounting.project(state).seats).toMatchObject([
      { seatId: "alice", stack: 0 },
      { seatId: "bob", stack: 101 },
      { seatId: "charlie", stack: 100 },
    ]);
  });

  test("a called all-in runs out the board and conserves the entire session", () => {
    const accounting = createDigitalAccounting({
      bigBlind: 2,
      housePolicyId: "p2-house-1",
      smallBlind: 1,
    });
    let state = acceptedState(
      accounting.submit(undefined, {
        seats: [
          { seatId: "alice", stack: 100 },
          { seatId: "bob", stack: 100 },
        ],
        type: "CreateSession",
      }),
    );
    state = acceptedState(
      accounting.submit(state, {
        activeSeatIds: ["alice", "bob"],
        dealerSeatId: "alice",
        handId: "hand-1",
        type: "StartHand",
      }),
    );
    state = acceptedState(
      accounting.submit(state, { seatId: "alice", type: "AllIn" }),
    );
    expect(accounting.legalActions(state, "bob")).toEqual([
      { type: "fold" },
      { amount: 98, type: "call" },
    ]);

    const called = accounting.submit(state, {
      seatId: "bob",
      type: "Call",
    });
    expect(called.status).toBe("accepted");
    if (called.status !== "accepted") throw new Error(called.code);
    expect(accounting.project(called.state)).toMatchObject({
      phase: "showdown",
      potTotal: 200,
      seats: [
        { seatId: "alice", stack: 0, status: "all-in" },
        { seatId: "bob", stack: 0, status: "all-in" },
      ],
      street: "river",
    });

    state = acceptedState(
      accounting.submit(called.state, {
        explanations: ["Bob wins with a flush."],
        type: "ProposeSettlement",
        winnersByPot: [["bob"]],
      }),
    );
    state = acceptedState(
      accounting.submit(state, { type: "ConfirmSettlement" }),
    );
    expect(accounting.project(state)).toMatchObject({
      phase: "complete",
      potTotal: 0,
      seats: [
        { seatId: "alice", stack: 0 },
        { seatId: "bob", stack: 200 },
      ],
    });
  });
});
