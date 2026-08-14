---
id: PRD-M12
kind: module
status: deferred
last_reconciled: 2026-08-14
decision_ids:
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
  - TEST-AI-PROVIDER-ACCESS
  - TEST-AI-SEAT-SAFETY
  - TEST-AI-STYLE-QUALITY
  - TEST-AI-CHINA-LOCAL
  - TEST-AI-GTO-TRAINER
router: ../manifest.yaml
---

# M12 — AI Players, GTO Trainer, and AI Gateway

## Context capsule

Phase 3 AI Players occupy ordinary seats through a provider-neutral Seat Controller interface. The AI Trainer adds a GTO Solver Adapter, Play Style transformation, and post-hand replay/export. The Game Core revalidates every proposal. Local models may run inside the trusted machine; remote models require a deployer-owned AI Gateway and an explicit owner disclosure gate.

## Problem Statement

Multiple modern models/styles could create a powerful poker-training table, but naïve integration leaks several seats to one provider, embeds credentials in HTML, trusts natural-language actions, couples play to outages, logs cards, or converts unused consumer subscription quotas into unsupported automation. A trainer that records only the final move also cannot show whether the AI followed a solver baseline or how its selected style changed that baseline.

## Solution and Interface

The Seat Controller interface receives a versioned seat-scoped observation, legal-action envelope, hand/decision IDs, deadline, and Play Style Profile; it returns one untrusted structured proposal. A provider-neutral GTO Solver Adapter creates or retrieves a labeled baseline for each recorded training decision. A Training Decision Record links that baseline, style transformation, final action, and a bounded user-facing consideration note for post-hand replay and export. Cancellation, timeout, fallback, and validation are core requirements.

### Owns

- AI observation/proposal schema, adapter lifecycle, timeout/cancellation, and human takeover/sit-out behavior.
- AI Gateway protocol, provider credentials, provider-policy eligibility, retention/log controls, and cost ceilings.
- Play Style Profile schema/versioning and reproducible evaluation metadata.
- GTO Solver Adapter, solver-result labeling, style-transformation trace, and Training Decision Record schemas.
- Provider Trust Domain isolation and multi-seat restrictions.

### Does not own

- Poker legality/authority ([M01](M01-GAME-CORE.md)).
- Hidden-card projection ([M02](M02-CARD-CUSTODY-PRIVACY.md)).
- Durable replay/export mechanics ([M07](M07-PERSISTENCE-RECOVERY-HISTORY.md)).
- Underlying machine-readable betting/history ([M10](M10-DIGITAL-ACCOUNTING.md)).
- Provider infrastructure or consumer subscription terms.

## User Stories

1. As a learner, I want several AI seats with independently chosen models and styles.
2. As a deployer, I want my own API credentials and optional officially supported subscription connectors.
3. As a privacy-conscious player, I want each remote request limited to one AI seat's own cards.
4. As a table, we want illegal/malformed/stale AI responses rejected deterministically.
5. As a cost-conscious user, I want visible budgets and no silent paid fallback.
6. As an offline traveler, I want optional local AI without cloud dependency.
7. As a human, I want play to continue when AI/provider access fails.
8. As a learner, I want to replay a completed hand and compare the solver baseline, selected style adjustment, AI explanation, and final action at each AI decision.
9. As an analyst, I want to download a versioned training record and reproduce the same table timeline later.

## Implementation Decisions

- AI is optional and begins only after Phase 2 exposes exact legal actions/accounting/history.
- Remote disclosure of an AI seat's cards requires `AI-CLOUD-TRUST`; participant notice and any same-provider multi-seat exception are decided then.
- Default: at most one live remote seat per Provider Trust Domain. Separate accounts/keys/models/regions do not prove isolation. Trusted local models may control multiple seats.
- Long-lived credentials never enter static HTML, peer messages, Connection Service, logs, or exported histories.
- Connection Service and AI Gateway may share a machine only as distinct least-privilege processes with no shared writable data, secrets, database, logs, proxy, or update channel.
- API/BYOK remains supported. A subscription adapter is enabled only when the exact provider product officially permits the intended automation. Exhaustion never silently changes billing route.
- Play Style Profiles are bounded versioned data and measured behavior, not arbitrary imported prompts or personality guarantees.
- Each recorded AI training decision links a solver baseline or explicit unavailable/error status, the applied Play Style Profile/version, the final validated proposal, and a concise user-facing consideration note. Missing analysis never masquerades as solved play.
- The consideration note is a generated explanation artifact, not raw provider chain-of-thought and not authoritative evidence that the model internally reasoned as described.
- Completed-hand replay/export uses M07 persistence and M10 action history. It remains projection-filtered: folded or mucked human cards and unrelated seat secrets are not exposed merely because the hand ended.
- Phase 3 research evaluates lawful free online solver access first and inspected open-source local execution as the offline/self-hosted route. No engine, licence, accuracy level, real-time method, or resource budget is assumed before that evidence exists.

## Testing Decisions

Test projection/cross-seat isolation, provider-domain collisions, prompt injection in public strings, schema smuggling, malformed/oversized/illegal actions, stale/replayed decision IDs, timeout/cancel races, outage, fallback/takeover, cost caps, credential/card/log scanning, same-machine account compromise, and provider error/policy fixtures. For the Trainer, verify solver licence/access, exact-versus-approximate labeling, decision coverage, baseline/style/final-action traceability, latency and hardware cost, unavailable/error behavior, privacy projections, and deterministic replay/export round-trips. Benchmark legality, reliability, strength, and style differentiation on reproducible deals. Field-test chosen China and local/Airplane adapters.

## Out of Scope

AI dealer/authority, arbitrary tools/code execution, credential sharing, assumed subscription reuse, silent API/overage fallback, provider eligibility without dated evidence, multi-seat remote provider disclosure by default, guaranteed style/strength, unlabeled claims of exact GTO play, raw provider chain-of-thought, automatic disclosure of folded/mucked human cards, and dependence of human play on AI.

## Further Notes

Kimi, Qwen, DeepSeek, OpenAI, Anthropic, and other providers are candidates—not promises. Recheck exact product terms, poker policy, region, retention/training/deletion, credentials, and model availability at implementation and release. Before Phase 3 design questions, run fresh `grill-with-research` foundation/pivot research across commercial/free solvers, inspected open-source engines, and relevant academic practice; then decide solver accuracy, timing, card visibility, record schema, and analysis UI.
