# ADR-0003: Provider-neutral AI seat boundary

- **Status:** Accepted for roadmap
- **Date:** 2026-08-14
- **Decider:** Project Owner
- **Scope:** Phase 3; M01, M02, M10, M12
- **Decision IDs:** `AI-PLAYER-PHASE-3`, `AI-ACCESS-DUAL-PATH`, `AI-SEAT-ADAPTER`, `AI-BYOK-GATEWAY`, `AI-PROVIDER-TRUST-DOMAIN`

## Context

Phase 3 should support training games with multiple AI models and play styles, including user-supplied API credentials, local models, and only officially permitted subscription tooling. No provider should control the game architecture or receive unrelated seats' private information.

## Evidence

### Facts

- AI providers expose materially different APIs, tool subscriptions, terms, regions, prices, and data handling.
- A browser bundle cannot safely contain long-lived provider secrets.
- Poker decisions require structured legal actions and current public/private seat state, which Phase 2 supplies.

### Inference

A narrow provider-neutral seat proposal interface and a separate local AI Gateway contain provider change and credential risk.

### Unknowns

Provider policy and subscription eligibility are time-sensitive. Model reliability, cost, poker strength, China access, latency, and style controllability require dated tests.

## Decision

Reserve a `SeatController` contract shared by human and AI controllers. An AI receives only its seat projection and legal-action schema, returns a proposal, and never commits an event. Game Core revalidates every proposal. Long-lived provider credentials live in an optional, isolated deployer-owned AI Gateway. API/BYOK access remains available; subscription adapters activate only where officially permitted and never silently fall back to billable API usage.

## Consequences

Providers and models can change without rewriting poker rules. The gateway adds a high-value local trust domain, deployment complexity, and explicit disclosure because a remote model sees its AI seat's cards. Base human and Airplane games remain independent of AI.

## Alternatives considered

- **Provider logic inside Game Core:** rejected due to coupling and credential/privacy risk.
- **Keys in browser storage/static HTML:** rejected because distributed clients cannot keep deployer secrets.
- **Unofficial subscription bypass:** rejected because unstable or prohibited automation is not a dependable product interface.

## Security and privacy effect

Default to one live remote AI seat per provider trust domain to reduce cross-seat visibility; local trusted models may control multiple seats. Prompts, responses, logs, and errors must exclude other seats' cards and secrets.

## Validation and revisit trigger

Activation waits for Phase 2's machine-readable action seam, a current provider policy matrix, projection and prompt-injection tests, stale/illegal-action handling, timeout/cost controls, and explicit owner approval of remote card disclosure.
