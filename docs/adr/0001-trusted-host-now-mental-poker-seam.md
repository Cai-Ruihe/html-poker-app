# ADR-0001: Trusted Host now, Mental Poker seam later

- **Status:** Accepted
- **Date:** 2026-08-14
- **Decider:** Project Owner
- **Scope:** Phase 1; M01, M02, M07, M08
- **Decision IDs:** `AUTH-TRUSTED-HOST`, `AUTH-FUTURE-MENTAL-POKER`, `PRIVACY-TRUST-CLAIM`, `TEST-MENTAL-POKER`

## Context

The host must shuffle, deal, recover, and project a live in-person game across ordinary browsers and Airplane Mode. Preventing the host from learning deck order requires a distributed cryptographic protocol with materially different shuffle, dropout, collusion, recovery, and audit behavior.

## Evidence

### Facts

- In a conventional authoritative game, the host process that generates and deals the deck can read it.
- Encrypting transport or browser storage does not hide plaintext from the process that must use it.
- Mental Poker protocols distribute shuffle/decryption work and add coordination and dropout complexity; the evidence index records representative academic work.

### Inference

Host-blind dealing would delay the robust local product and create a larger security protocol before the interaction and compatibility baseline is proven.

### Unknowns

Acceptable latency, mobile-browser cryptographic performance, recovery after a participant disappears, and independent review cost remain unmeasured.

## Decision

Phase 1 uses one explicit Trusted Host with readable Card Custody. Encryption, capabilities, projections, backups, and diagnostics protect against unauthorized peers and services, but not a malicious or compromised host. Card Custody exposes a narrow replaceable interface so a separately designed Mental Poker implementation can be evaluated later.

## Consequences

The first release can prioritize Airplane Mode, China operation, recovery, and broad browser participation. The product must display and document the host-trust limitation and may not claim cryptographic fairness against the host. Permanent host loss may end the game.

## Alternatives considered

- **Mental Poker in Phase 1:** rejected due to protocol, recovery, performance, and audit scope.
- **Obfuscated host code:** rejected as a security claim; the host owner controls the runtime.
- **Central cloud poker engine:** rejected because it creates mandatory infrastructure and weakens Airplane/deployer independence.

## Security and privacy effect

The host is a high-value trust domain. Official release integrity, host-device hardening guidance, filtered projections, key separation, and red-team tests become mandatory. This ADR does not promise a fair game when the host is malicious.

## Validation and revisit trigger

Revisit only after Phase 1 reliability evidence exists and Mental Poker receives a separate protocol threat model, performance/dropout prototype, collusion analysis, and independent cryptographic review.
