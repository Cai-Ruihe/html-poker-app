# PRD system

## Purpose

This directory is a context-efficient product specification system. It avoids one giant PRD by separating four kinds of authority:

1. [Master PRD](MASTER-PRD.md): product direction, constraints, roadmap, and routing only.
2. [Phase PRDs](phases/): the user outcome, included module capabilities, integration journey, and release gates for one phase.
3. [Module PRDs](modules/): one deep module's interface, invariants, behavior, and test seam across phases.
4. [Decision register](reference/DECISION-REGISTER.md): stable decision IDs, status, and owning PRD. Search it by ID; do not load it wholesale unless reconciling the product.

The machine-readable [manifest](manifest.yaml) owns the document graph and common task context packs; [manifest.schema.json](manifest.schema.json) defines its structural contract. The [glossary](reference/GLOSSARY.md) owns canonical terms.

## Authority order

When documents disagree, use this order and stop to reconcile the lower document:

1. Ruihe's latest explicit decision.
2. Accepted architecture decision records, when later added.
3. `reference/DECISION-REGISTER.md`.
4. `MASTER-PRD.md`.
5. The active Phase PRD.
6. The owning Module PRD.
7. Tickets, plans, tests, and implementation notes.

Research defaults may fill ordinary gaps but cannot override locked decisions. A failed named feasibility test may reopen a decision; retrieval failure cannot.

## Minimal loading protocol

For normal implementation work, load only:

1. `MASTER-PRD.md`;
2. one active Phase PRD;
3. one primary Module PRD;
4. at most two `context_dependencies` named by the manifest; and
5. only the decision-register rows named in those documents' `decision_ids` front matter.

Do not preload every PRD. Use a manifest `context_pack` when one matches the task. `context_dependencies` describe useful reading, not permitted source-code imports; code dependency direction is owned by the architecture documentation. A phase-wide Phase 1 Red Team runs the four bounded `*_red_team` packs sequentially and aggregates their findings rather than preloading every module. Add equivalent phase-specific packs when a later phase activates. Load the evidence index only for architecture, security, policy, or disputed-default work.

## Document budgets

- Master PRD: target at most 1,500 words.
- Phase PRD: target at most 1,500 words.
- Module PRD: target at most 1,200 words.
- Each PRD starts with a short context capsule and uses links instead of copying another document's detail.

If a document exceeds its budget, move detail to the owning Module PRD, a decision record, a test plan, or a ticket. Do not solve length by deleting requirements.

## Change protocol

1. Identify the single document that owns the changed requirement.
2. If Ruihe made or changed a decision, update the decision register first and preserve superseded history.
3. Update only the owning PRD; other PRDs should link to it.
4. Update `manifest.yaml` only when the document graph or task packs change.
5. Check links, unique document/decision IDs, word budgets, phase-module coverage, manifest/schema shape, and bidirectional decision ownership (`decision_ids` ↔ register Owner column).
6. Run an intent review before calling the PRD system current.

## Status vocabulary

- `locked`: explicit owner decision.
- `research-default`: evidence-backed ordinary choice; no owner question unless its trigger fires.
- `soft-set`: provisional interaction choice awaiting a named prototype.
- `deferred`: postponed to a named phase or scope-reopen trigger.
- `test-gate`: empirical question; test rather than ask for preference.
- `open-major`: owner question admitted only after evidence shows no safe default, test, or existing decision can settle it.
- `superseded`: retained for history and no longer controlling.
