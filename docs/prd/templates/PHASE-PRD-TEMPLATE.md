---
id: PRD-PX
kind: phase
status: draft
last_reconciled: YYYY-MM-DD
decision_ids:
  - DECISION-ID
router: ../manifest.yaml
---

# Phase X — Outcome

## Context capsule

In at most 100 words: user outcome, entry prerequisites, included modules, and decisive exclusions.

## Participating modules

Link every Module PRD listed for this phase in `manifest.yaml`. Name the primary module(s); do not copy module requirements.

## Problem Statement

State the phase-level user problem without copying module behavior.

## Solution

Describe the end-to-end product outcome.

## User Stories

Number complete user journeys. Keep module-internal stories in their owning PRD.

## Implementation Decisions

- Integration order and cross-module invariants.
- Entry/exit gates.
- Decision IDs only; link rather than restate rationale.

## Testing Decisions

- End-to-end journeys.
- Module interface tests required for release.
- Named Test Gates and failure behavior.

## Out of Scope

List later-phase and explicitly deferred capabilities.

## Further Notes

State residual Unknowns and the exact trigger for revisiting them.
