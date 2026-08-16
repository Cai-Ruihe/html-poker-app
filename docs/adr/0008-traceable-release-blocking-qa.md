# ADR-0008: Traceable, release-blocking product QA

- **Status:** Accepted
- **Date:** 2026-08-17
- **Deciders:** Project Owner; implementation maintainer
- **Scope:** Product requirements, interaction design, browser implementation, CI, and releases
- **Decision IDs:** `GOV-RED-TEAM`, `MODE-SEPARATION`, `RECOVERY-FOREGROUND-AUTO`, `TEST-IOS-STANDALONE`

## Context

The Phase 1 browser journeys proved that selected controls existed and that one quick action could be invoked, but they did not prove complete behavior or rendered conformance. The suite never opened the second-level menu, never invoked Players & seats, and never verified its resulting administration surface. A native range input, a nonfunctional/incomplete secondary panel, and visibly incorrect spacing therefore reached the published field build while the automated suite remained green. The defects were visible or reproducible in an ordinary browser and did not depend on a physical iPad.

Product requirements also live across a Master PRD, phase PRDs, module PRDs, a decision register, an approved Tablet feedback record, and field feedback. Relying on an agent's conversation context to remember those sources is not a repeatable release process.

## Evidence

### Facts

- The pre-existing Tablet journey asserted element counts, labels, orientation metadata, and one Next Card result; it neither opened/invoked the secondary controls nor compared a rendered image or asserted slider/panel geometry.
- Progress screenshots were optional and were not produced by CI unless an environment variable was supplied.
- Playwright can assert element geometry, accessibility behavior, browser interactions, and deterministic screenshots in CI.
- Physical devices are still required for camera, suspension, standalone-file, network, and browser-chrome behavior that an emulator cannot establish.

### Inferences

- A machine-readable registry plus a validator can make missing PRD, decision, design, or feedback coverage fail before browser tests run.
- Pixel baselines alone are too brittle and too weak: they must be paired with semantic, geometry, interaction, and negative assertions.
- A physical-device gate must add evidence, never waive a failure already observable in automated renders.

### Unknowns

- Exact iOS process-discard, camera, local-network, and long-suspension behavior remains a field-test concern for each frozen candidate.
- Pixel rendering can differ by browser engine and operating system; deterministic Chromium snapshots therefore coexist with cross-engine geometry and behavior tests.

## Decision

1. `docs/quality/qa-registry.yaml` is the machine-readable QA authority. It imports every PRD User Story and Testing Decision, every Decision Register ID, every Tablet design decision ID, and every field-feedback ID.
2. `pnpm qa:registry` fails when an authoritative source is absent, a stable ID is untracked, an evidence file is missing, or an active Phase 1 area has no automated and manual evidence route.
3. Visible changes require all of the following: deterministic screenshots, exact or tolerance-bounded geometry, semantic/accessibility assertions, responsive overflow checks, rejected-design negative assertions, and end-to-end invocation of every available control on the changed surface.
4. Approved Tablet geometry and behavior are release contracts, including the four equal corners, 180-degree upper-seat orientation, 650-by-244 reference quick panel at the 1366-by-1024 reference viewport, 52-pixel utilities, 18-pixel action gap, 190-pixel Next Card action, 374-pixel Next Hand action, 156-by-64 slider track, 64-pixel handle, 92-pixel travel, and continuous four-pixel gold thread.
5. The next-hand control is a custom pointer/keyboard component. Browser-native range rendering is not accepted for this physical-slider design.
6. CI runs registry validation, contract tests, cross-engine journeys, accessibility checks, and visual conformance before GitHub Pages deployment.
7. Release evidence records commit, toolchain, outcome, and minimized artifact links. A failed or missing release-blocking gate prevents publication.
8. Physical-device and network checks remain explicit candidate gates. They cannot turn an automated failure into a pass and cannot be cited as the cause of a screenshot-visible implementation defect.

## Consequences

### Benefits

- Product memory is durable and reviewable outside any model context window.
- A UI can no longer pass merely because a mislabeled or malformed control is clickable.
- Deferred Phase 2/3 requirements remain visible without being misrepresented as Phase 1 support.
- Published evidence distinguishes automated fact, physical-field fact, inference, and unknown.

### Costs and risks

- Intentional visual changes require baseline review and an updated decision or feedback reference.
- Browser journeys take longer and require deterministic fixtures or masked dynamic content.
- The registry is another maintained artifact; its validator and source import rules therefore run on every change.

## Alternatives considered

- **Manual screenshot review only:** rejected because it is not repeatable, searchable, or CI-blocking.
- **Pixel snapshots only:** rejected because a visually similar control can still have broken interaction, semantics, privacy, or responsive behavior.
- **Physical-device QA only:** rejected because it is slower, less deterministic, and would still not justify missing defects visible in desktop renders.
- **Conversation checklist:** rejected because it disappears with context and cannot govern contributors or CI.

## Security and privacy effect

The system keeps Card Privacy Red Team and projection-leak tests release-blocking. Visual evidence uses deterministic or redacted states and must not contain live invitation tokens, credentials, hidden cards, or private diagnostics.

## Validation and revisit trigger

This ADR is validated when a deliberately malformed Tablet slider or missing secondary category fails CI, the corrected implementation passes the full gate, and a clean deploy cannot run unless that gate succeeds. Revisit if visual false positives become routine, supported engines require different deterministic baselines, or the PRD source model changes.
