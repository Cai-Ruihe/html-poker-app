---
id: PRD-MXX
kind: module
status: draft
last_reconciled: YYYY-MM-DD
decision_ids:
  - DECISION-ID
router: ../manifest.yaml
---

# MXX — Module name

## Context capsule

In at most 100 words: what the module owns, its interface, phases, and decisive exclusions.

## Problem Statement

Describe the complexity this module hides from callers.

## Solution and Interface

State the smallest caller-facing interface, including invariants, ordering, errors, configuration, and observable outcomes. Name adapters only where at least two implementations are real.

### Owns

- Authoritative responsibilities.

### Does not own

- Responsibilities belonging to linked modules.

## User Stories

Number only stories owned by this module.

## Implementation Decisions

- Cite decision IDs.
- Link dependencies; do not copy their requirements.
- Describe phase deltas without implementation file paths.

## Testing Decisions

Use the module interface as the test seam. List behavioral, fault, privacy, and compatibility obligations.

## Out of Scope

Name exclusions and deferred triggers.

## Further Notes

Facts, inferences, and material Unknowns only.
