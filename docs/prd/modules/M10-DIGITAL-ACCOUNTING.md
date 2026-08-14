---
id: PRD-M10
kind: module
status: deferred
last_reconciled: 2026-08-14
decision_ids:
  - SCOPE-PLAY-MONEY
  - ACCOUNTING-PHASE-2
  - PHASE2-NLHE-HOME-SESSION
  - TEST-RULES-PROFILE
  - TEST-ACCOUNTING
router: ../manifest.yaml
---

# M10 — Digital Play-Chip Accounting

## Context capsule

Phase 2's optional accounting module owns machine-readable No-Limit Hold'em actions, stacks, contributions, pots, awards, buy-in units, settlement, and exports. Its interface extends Game Core with exact legal actions and emits immutable accounting events. All units are play chips with no money, payment, cash-out, rake, or transfer value.

## Problem Statement

Playing without physical chips requires more than a counter. Calls, raises, short all-ins, side pots, ties, corrections, and settlement must conserve chips and remain understandable after disconnect/replay. An incorrect ledger would make the product unusable and undermine later AI training.

## Solution and Interface

Given committed public hand state and one player's private eligibility, expose exact legal action options and validate a selected amount. Record buy-in/top-up and contribution events, derive ordered pots/eligibility, propose awards, enter `SettlementPending`, and commit balances only through confirmed settlement.

### Owns

- Digital action legality/amounts, betting-round closure, stacks/contributions, pots and eligibility.
- Buy-in/top-up count and session balance ledger.
- Settlement proposal, confirmation, adjustment/correction, and chip conservation.
- Public/personal machine-readable history and human-readable result explanation.

### Does not own

- Card lifecycle/evaluation ([M01](M01-GAME-CORE.md)).
- Private-card projection ([M02](M02-CARD-CUSTODY-PRIVACY.md)).
- Persistence mechanics ([M07](M07-PERSISTENCE-RECOVERY-HISTORY.md)).
- Money/payment/club accounts.

## User Stories

1. As a player, I want exact legal actions and amounts so I cannot create an impossible pot.
2. As a short-stacked player, I want all-in and side-pot eligibility calculated correctly.
3. As a host, I want buy-ins/top-ups counted in play-chip units.
4. As a table, we want a readable pot-by-pot winning-hand explanation.
5. As a dealer, I want balances unchanged until settlement is confirmed.
6. As a player, I want corrections visible as new ledger events, not rewritten history.
7. As an analyst/AI adapter, I want versioned JSON preserving exact amounts/actions.

## Implementation Decisions

- Initial profile is single-table, home-session No-Limit Texas Hold'em. `BettingStructure` and `SessionPolicy` remain explicit axes.
- Phase 1 never instantiates this module or fake zero-valued accounting state.
- Derive pots from immutable contributions/eligibility; never mutate a pot total as the sole truth.
- Settlement proposal and balance mutation are separate. Confirmation timing/authority, odd-chip rule, straddles, antes, and missed blinds are deferred to Phase 2 research/specification.
- Every correction references original entries and preserves total conservation.
- Histories separate public facts, the player's own cards, and diagnostics; no all-card export.

## Testing Decisions

Use property/model-based tests at the accounting interface. Assert legal-action sets, min/max raises, non-negative stacks, total conservation, deterministic replay, and pot eligibility. Cover heads-up, folds after contribution, short calls, multiple side pots, simultaneous all-ins, ties, odd chips, top-up/sit-out, disconnect, duplicate actions, settlement rejection/reopen, and correction. Differentially verify representative vectors.

## Out of Scope

Real money, payments, rake, credit, clubs, tournament lifecycle, multi-table balancing, other betting structures in the first slice, and automated settlement without confirmation.

## Further Notes

Phase 2 begins only after its unresolved house policies are researched. This PRD reserves the deep module and test seam without pretending those future choices are settled.
