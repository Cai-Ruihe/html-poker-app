---
id: PRD-M01
kind: module
status: current
last_reconciled: 2026-08-14
decision_ids:
  - PHASE1-DEAL-ONLY
  - AUTH-TRUSTED-HOST
  - ARCH-SHARED-CORE
  - RULES-VERSIONED-PROFILE
  - PHASE1-ONE-TABLE-PER-HOST
  - AUTHORITY-PERSIST-BEFORE-ACK
  - JOIN-MID-HAND
  - DEALER-RELOCATION
  - FOLD-UNDO
  - SHOWDOWN-CONCEDE
  - HAND-END-EXPLICIT
  - CORRECTION-LIVE-EVENTS
  - CORRECTION-DEAL-REPAIR
  - AI-SEAT-ADAPTER
  - TEST-RULES-PROFILE
  - TEST-CORRECTION-REPLAY
router: ../manifest.yaml
---

# M01 — Game Core

## Context capsule

The Game Core is the single authoritative rules/lifecycle module. Its interface accepts authenticated, revision-bound commands and produces deterministic accepted events or explicit rejections under one pinned Rules Profile. It hides hand-state complexity from presentation, transport, accounting, AI, and persistence callers. It never owns networking, UI, card encryption, or storage technology.

## Problem Statement

If poker transitions are spread across UI, peers, timers, and later accounting/AI code, duplicate commands and partial feature combinations will corrupt the hand. Phase 1 and Phase 2 also need different authorities for street progression without creating separate games.

## Solution and Interface

The external interface is conceptually one operation: submit a command with table/hand identity, actor capability, command ID, authority epoch, expected revision, and payload; receive a committed receipt or typed rejection. The module exposes deterministic replay from accepted events and role-neutral facts needed to build projections.

### Owns

- Rules Profile compatibility and lifecycle legality.
- Seats in hand, logical dealer/blind positions, streets, fold/show/muck/concede, evaluator facts, and explicit hand end.
- Command idempotency semantics, revision progression, typed corrections, and event schema.
- Phase 1 explicit street authority and Phase 2 `BettingRoundClosed` authority.

### Does not own

- Hidden deck values/shuffle/private projection ([M02](M02-CARD-CUSTODY-PRIVACY.md)).
- Authentication issuance ([M03](M03-IDENTITY-SEATS-CAPABILITIES.md)).
- Durable transaction implementation/recovery ([M07](M07-PERSISTENCE-RECOVERY-HISTORY.md)).
- Rendering ([M06](M06-PRESENTATION-INTERACTION.md)) or chip rules ([M10](M10-DIGITAL-ACCOUNTING.md)).

## User Stories

1. As a dealer, I want every accepted action to advance exactly once.
2. As a reconnecting device, I want stale/duplicate commands rejected or replayed idempotently.
3. As a physical-chip table, I want explicit street/hand controls without invented chip state.
4. As a digital-chip table, I want street advance only after the betting round closes.
5. As a player, I want irreversible Show, guarded fold undo, and explicit End Hand behavior to replay identically.
6. As a maintainer, I want later rules profiles isolated rather than scattered feature flags.

## Implementation Decisions

- Use one command/event reducer and version every command, event, Rules Profile, and reducer migration.
- `PHASE1-DEAL-ONLY` contains no bet amount, stack, pot, or settlement truth.
- A fold remains provisional until timeout or first dependent irreversible event; replay uses explicit `FoldFinalized`/`FoldRetracted`, not current wall time.
- Dealer relocation is an explicit between-hand administration event. It changes the logical dealer seat without dealing cards, starting a hand, or recording blind payments.
- Accepted history is append-only. Corrections reference prior event IDs; unsafe repair voids rather than silently rewinds.
- Hand evaluation uses the standard Texas Hold'em high-hand profile and only available public/voluntarily shown cards. Unknown stays Unknown.
- Coordinate the M02 Card Custody and M07 persistence adapters at the command boundary so custody/event/revision/idempotency state enters one atomic commit before any success or irreversible projection.

## Testing Decisions

The command handler plus replay interface is the primary test seam. Use table-driven state transitions, property tests for legal event sequences, duplicate/reorder/race faults, snapshot-versus-genesis replay, rules-version mismatch, and Phase 1 no-chip-state assertions. Differentially test hand evaluation. Exercise heads-up dealer/blind logic, all-fold, one-show/rest-muck, correction/void, and multiple controllers.

## Out of Scope

Transport consensus, host election, real money, tournament/multi-table rules, Omaha/Short Deck, Mental Poker implementation, UI timing, and storage engines.

## Further Notes

The Trusted Host can manipulate the running core if compromised. The module improves correctness and testability; it does not create host blindness.
