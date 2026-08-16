---
id: PRD-P3
kind: phase
status: deferred
last_reconciled: 2026-08-14
decision_ids:
  - ARCH-SHARED-CORE
  - SKINS-PHASE-3
  - AI-PLAYER-PHASE-3
  - AI-CLOUD-TRUST
  - AI-ACCESS-DUAL-PATH
  - AI-SEAT-ADAPTER
  - AI-BYOK-GATEWAY
  - AI-PROVIDER-TRUST-DOMAIN
  - AI-GATEWAY-COLOCATION
  - AI-OPTIONAL-DEGRADATION
  - AI-GTO-TRAINER
  - AI-GTO-SOLVER-SELECTION
  - AI-TRAINING-REPLAY
  - TEST-SKINS
  - TEST-AI-PROVIDER-ACCESS
  - TEST-AI-SEAT-SAFETY
  - TEST-AI-STYLE-QUALITY
  - TEST-AI-CHINA-LOCAL
  - TEST-AI-GTO-TRAINER
router: ../manifest.yaml
---

# Phase 3 — Community Skins and AI Training Players

## Context capsule

Add two independent optional capabilities after Phase 2: declarative Community Skins and provider-neutral AI Players with selectable models, Play Style Profiles, solver-guided training decisions, and post-hand analysis. Neither can weaken the core, access unrelated hidden cards, or become a dependency for human, China, or Airplane play. Remote AI card disclosure requires an explicit owner gate at activation.

## Participating modules

Participating modules: [M11 Community Skins](../modules/M11-COMMUNITY-SKINS.md) and [M12 AI Players](../modules/M12-AI-PLAYERS.md) are primary; the phase also integrates [M01 Game Core](../modules/M01-GAME-CORE.md), [M02 Card Custody](../modules/M02-CARD-CUSTODY-PRIVACY.md), [M03 Identity](../modules/M03-IDENTITY-SEATS-CAPABILITIES.md), [M04 Connectivity](../modules/M04-CONNECTIVITY-SERVICE.md), [M05 Airplane Mode](../modules/M05-AIRPLANE-MODE.md), [M06 Presentation](../modules/M06-PRESENTATION-INTERACTION.md), [M07 Persistence/History](../modules/M07-PERSISTENCE-RECOVERY-HISTORY.md), [M08 Diagnostics/Red Team](../modules/M08-DIAGNOSTICS-RED-TEAM.md), [M09 Release](../modules/M09-RELEASE-DISTRIBUTION.md), and [M10 Digital Accounting](../modules/M10-DIGITAL-ACCOUNTING.md).

## Problem Statement

Open-source users should be able to personalize the table without injecting executable code into a card-sensitive origin. Ruihe also wants a training table containing multiple AI styles/providers and a GTO solver baseline, including API models and any officially supported subscription adapters, without leaking other seats' cards, silently incurring charges, or coupling the base game to provider availability. Completed hands need enough structured evidence to replay and compare solver guidance, style variation, explanation, and final action.

## Solution

Community Skins use a versioned manifest and validated assets/tokens only. Device-local accessibility overrides always win. AI Players use the same seat-scoped proposal interface as humans; the Game Core supplies exact legal actions and revalidates every response. The AI Trainer obtains a labeled solver baseline, applies a versioned Play Style Profile, records a bounded explanation and final action, then exposes the privacy-filtered trace only after hand end through replay or download. Local models can remain inside the trusted machine. Remote models are invoked through a separate AI Gateway holding deployer-owned credentials and receive only public state plus their own seat's private cards after the disclosure gate.

## User Stories

1. As a player, I want to select an original card/table theme without changing poker behavior.
2. As a skin author, I want a documented data schema and validation feedback without code execution privileges.
3. As an accessibility user, I want high contrast, larger ranks, four-color cards, reduced motion, and mute settings even when the host selects a skin.
4. As a learner, I want several AI seats with different models and measurable play styles.
5. As a deployer, I want API/BYOK support and officially permitted subscription adapters without sharing Ruihe's access.
6. As a cost-conscious user, I want exhaustion or failure to stop/fallback visibly rather than silently consume paid API or overage.
7. As a privacy-conscious table, I want one remote AI provider trust domain to see at most one live seat by default.
8. As an Airplane player, I want human play to continue and optional AI to work only through an installed local adapter.
9. As a maintainer, I want AI proposals treated as untrusted and fully revalidated.
10. As a learner, I want each completed training hand to replay the table alongside solver output, style adjustment, AI consideration note, and final action.
11. As an analyst, I want to download a versioned record that can reproduce the hand for later study.

## Implementation Decisions

- Skins may define semantic colors, typography, spacing, motion, sounds, card faces/backs, felt, and renderer variants. They cannot contain JavaScript, HTML, remote runtime dependencies, or state selectors.
- Skin assets have schema, MIME/size, licence metadata, content hash, accessibility, and safe-fallback validation.
- `AI-SEAT-ADAPTER` exposes only seat-scoped observation, exact legal actions, decision identity, timeout, and a validated proposal.
- Long-lived credentials remain in a deployer-owned AI Gateway. Co-location with the Connection Service requires separate processes, OS identities, data, secrets, ports, and logs.
- API/BYOK stays first-class. Subscription access is enabled only through an official, policy-permitted developer/automation surface; Kimi/Claude/Codex consumer tooling is not assumed reusable for unattended poker.
- No silent API/Extra Usage fallback. Provider ambiguity means disabled.
- Remote cloud use requires `AI-CLOUD-TRUST`; by default, only one live remote AI seat per Provider Trust Domain is allowed.
- Play Style Profiles are versioned data with measurable parameters and evaluation metadata, not claims of personality or strength.
- The GTO Solver Adapter is provider-neutral. Phase 3 research evaluates lawful free online access and inspected open-source local execution before selecting engines or claiming exactness.
- Training records preserve solver result or explicit unavailable status, applied style/version, final validated action, and a concise explanation—not raw model chain-of-thought. Post-hand replay/export remains privacy-filtered.

## Testing Decisions

- Fuzz skin schemas/assets and prove skins cannot execute code, access state, bypass accessibility, or break safe fallback.
- For each AI adapter, test projection isolation, cross-seat identifiers, prompt injection, malformed/stale/duplicate responses, illegal actions, timeout/cancellation, outage, secret/card logging, and cost ceilings.
- Benchmark legality, reliability, cost, playing strength, and style differentiation across reproducible hands.
- Verify solver coverage/accuracy labeling, style transformation, failure behavior, and deterministic privacy-safe replay/export for every recorded training hand.
- Test local AI under Airplane hardware constraints and selected China networks; provider documentation is not readiness evidence.
- Red Team provider correlation and same-machine process compromise before activation.

## Out of Scope

Arbitrary plug-ins/prompts, provider credentials in browser code, automatic paid fallback, provider eligibility by assumption, remote AI before disclosure approval, AI authority over the Game Core, guaranteed style/strength, unlabeled exact-GTO claims, raw provider chain-of-thought, automatic disclosure of folded or otherwise unrevealed human cards, and Mental Poker.

## Further Notes

Phase 3 must begin with fresh `grill-with-research` foundation/pivot research covering providers, commercial/free solvers, inspected open-source engines, academic practice, regional availability, retention/training controls, poker policy, supported subscription mechanisms, solver feasibility, and replay-card visibility before detailed design questions are asked.
