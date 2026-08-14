---
id: PRD-M08
kind: module
status: current
last_reconciled: 2026-08-14
decision_ids:
  - GOV-RED-TEAM
  - PRIVACY-ZERO-TELEMETRY
  - DIAGNOSTICS-30-DAYS
  - DIAGNOSTIC-HAND-ID
  - TEST-UPDATE-SUPPLY-CHAIN
  - TEST-REMOTE-COMPROMISE
  - TEST-AI-SEAT-SAFETY
router: ../manifest.yaml
---

# M08 — Diagnostics and Card Privacy Red Team

## Context capsule

This module makes failures diagnosable without turning observability into a card leak. Developer Mode shows a long Hand ID and emits an allowlisted, redacted behavior/event trace kept locally or on an optional configured server for 30 days. Every phase has an independent adversarial review focused on card confidentiality plus that phase's new attack surface.

## Problem Statement

Peer/network/browser failures are difficult to reproduce, but generic logging, crash reporting, screenshots, and AI/provider tooling can serialize whole game objects, secrets, or cards. “Log everything” is incompatible with the product's primary privacy goal unless the schema itself excludes secrets.

## Solution and Interface

The diagnostics interface accepts only named, schema-validated event fields and returns local/export/remote receipt status. It has no method accepting arbitrary objects or exception context. The Red Team interface is a phase checklist producing attacks, evidence, failures, fixes, and explicit residual boundaries.

### Owns

- Hand ID generation/display and correlation metadata.
- Allowlisted diagnostic schema, pseudonymization, local buffering, export, optional upload, quota, and 30-day expiry.
- Security test inventory and per-phase independent Red Team report.
- Honest security/readiness claim language and unresolved-risk tracking.

### Does not own

- Authoritative event history ([M07](M07-PERSISTENCE-RECOVERY-HISTORY.md)).
- Card projections/keys ([M02](M02-CARD-CUSTODY-PRIVACY.md)).
- Release/dependency controls ([M09](M09-RELEASE-DISTRIBUTION.md)).
- Provider telemetry inside AI systems, though it must test that boundary ([M12](M12-AI-PLAYERS.md)).

## User Stories

1. As Ruihe, I want a visible Hand ID so a reported failure can be located quickly.
2. As a developer, I want command timing, revision, route, lifecycle, and redacted error evidence.
3. As a player, I want assurance that unrevealed cards and keys never enter diagnostics.
4. As an offline host, I want local buffering/export when no diagnostic server exists.
5. As a maintainer, I want logging failure never to block a game command.
6. As a release owner, I want each phase attacked independently before claims are made.

## Implementation Decisions

- Developer Mode is explicit and optional. The normal official app has zero analytics/crash telemetry.
- Generate each Hand ID as a CSPRNG-backed UUIDv7, reject any duplicate already present in the local table/history scope, and show the copyable full value unobtrusively in Developer Mode. It is a correlation ID, never a credential.
- Logs use table/hand/revision/command/actor pseudonym, event type, timings, route, result/error class, build/protocol, and capability scope—not names, URLs, secrets, payload dumps, card values, or arbitrary stack traces.
- Remote diagnostics are encrypted/authenticated as required but remain redacted before encryption.
- Retain 30 days when a server is configured; local quota evicts oldest unpinned diagnostics before recovery state.
- Phase 1 Red Team work runs the manifest's four bounded red-team context packs sequentially—card/release, identity/transport, authority/recovery, and Airplane/presentation—then aggregates minimized findings. Later phases add equivalent packs for their new modules.
- Red Team scope includes malicious peers, signaling, dependencies/update, XSS, storage, replay, browser extensions/DevTools boundary, logs/backups, controller capabilities, Airplane artifacts, accounting, skins, and AI adapters as phases activate.
- Findings distinguish exploit demonstrated, plausible inference, and untested Unknown. A subagent review is not described as a human security audit.

## Testing Decisions

Generate every event/error path and scan logs, exports, crash handling, server storage, backups, browser history, and network requests for canary cards/keys/tokens. Test Hand ID format, clock rollback, same-millisecond generation, local duplicate rejection, quota, expiry, server outage, malformed/oversized diagnostic input, correlation, and pseudonym stability. Each phase's Red Team reruns core privacy regression attacks plus new module-specific attacks.

## Out of Scope

Surveillance analytics, player profiling, gameplay optimization telemetry, unlimited retention, logging provider prompts/responses, perfect-security claims, and substituting this process for an independent human penetration assessment when one is later required.

## Further Notes

Robustness has higher priority than advanced protocols, but it cannot cross the hidden-card privacy floor. Diagnostic usefulness must come from precise event metadata, not secret-rich snapshots.
