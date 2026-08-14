# Quality gates

**Status:** Normative baseline under [ADR-0007](../adr/0007-typescript-browser-monorepo-toolchain.md).

Quality claims require evidence on the affected surface. A passing unit suite alone cannot establish card privacy, browser compatibility, Airplane support, China readiness, or release integrity.

## Every pull request

- Scope links to an issue and controlling PRD/decision/ADR.
- Formatting, static analysis, and relevant automated tests pass once tooling exists.
- Public contracts and event/schema changes include compatibility tests and documentation.
- Visible changes include keyboard/touch/accessibility checks and evidence at affected viewport modes.
- Security/privacy impact is stated; affected trust boundaries have negative tests.
- No credentials, hidden cards, deck order, personal data, generated support bundles, or unreviewed binary assets enter version control.
- Documentation links, IDs, manifest/schema entries, phase-module links, bidirectional decision ownership, and word budgets remain valid.

## Current automated commands

Run the locked local gate with Node.js 24 and pnpm 11:

```sh
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check` covers formatting, architecture lint rules, strict type checks, documentation validation, workspace peer dependencies, Vitest contract tests, and the production build. For changes to presentation, browser behavior, or a browser-facing trust boundary, also run:

```sh
pnpm exec playwright install chromium webkit
pnpm test:e2e
```

Run `pnpm test:coverage` for authority, custody, persistence, and projection-policy changes. These commands are contribution gates; the physical device, network, security, and release gates below remain separate evidence requirements.

Dependency or release changes must also run `pnpm audit:prod` and review `pnpm licenses:prod`. The lockfile, audit result, and licence inventory are evidence; they do not replace source/provenance review or the release notice bundle.

## Module contract gates

| Module area | Minimum evidence |
|---|---|
| Game Core | deterministic command/event tests, illegal-transition rejection, idempotency, replay equivalence |
| Card Custody | role-projection tests, shuffle/deal correctness, reveal irreversibility, secret-search negatives |
| Identity/Capabilities | expired/replayed/revoked credential tests, authority non-escalation, replacement behavior |
| Connectivity | direct/private/cloud route matrix, encryption/authentication, reconnect and service-compromise tests |
| Airplane | real-device no-internet journey, two-way QR replay/expiry, hotspot isolation detection |
| Presentation | Player/Tablet/TV mode tests, touch/keyboard/screen-reader checks, privacy screenshots |
| Persistence | persist-before-ack, crash/duplicate/race/quota tests, digest and recovery tests |
| Diagnostics | schema allowlist, secret canaries, retention deletion, export inspection |
| Accounting | legal actions, property-based chip conservation, side pots, ties, odd chips, correction replay |
| Skins | schema-only validation, no executable content, asset rights, contrast/performance |
| AI seats | seat projection isolation, illegal/stale/timeout response, provider/log/cost controls |

## Phase security gate

Every phase has a Card Privacy Red Team review independent from the implementation pass. It attacks host/peer role confusion, projection leaks, browser storage, reconnect, diagnostics, backup, relay, supply chain, and the new phase boundary. Findings are tracked to fix, explicit risk acceptance, or release block.

The red-team agent is a useful adversarial reviewer, not proof of perfect security or a substitute for later expert review where risk warrants it.

## Release gate

- Supported device/browser/network matrix passes without undocumented exceptions.
- Reproducible or provenance-verifiable immutable artifacts are generated from the tagged commit.
- Dependency inventory, licences, integrity pins, vulnerability findings, and third-party notices are reviewed.
- Upgrade, downgrade, mixed-version, offline-worker, and rollback behavior is exercised.
- Security and conduct private-reporting channels are live.
- Claims match evidence: unpassed China, Airplane, recovery, performance, or security targets stay unclaimed.
- Known limitations and unresolved accepted risks appear in release notes.

## Evidence record

Release evidence should identify commit, artifact digest, toolchain/lockfile, test environment, devices/browsers/networks, date, pass/fail/blocked outcome, and links to minimized logs. Never attach hidden-card plaintext or secrets as proof.
