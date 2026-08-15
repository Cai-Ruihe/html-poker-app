# Quality gates

**Status:** Normative baseline under [ADR-0007](../adr/0007-typescript-browser-monorepo-toolchain.md). The local Phase 1 implementation has automated evidence, but no official release gate is marked complete without the dated external receipt it requires.

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

The 80% Vitest threshold measures deterministic card, game, identity, diagnostics, transport, and relay-broker source. It deliberately does not pretend that a Node unit runner can witness the browser composition/runtime, IndexedDB/WebCrypto lease bridge, or Connection Service HTTP/WebSocket entry point. Those environment-bound surfaces require the relevant Playwright journeys and, before a support claim, the physical-device evidence in the release gate. New deterministic source belongs in the measured paths; adding a coverage exclusion is not an alternative to a test.

Dependency or release changes must also run `pnpm audit:prod` and review `pnpm licenses:prod`. The lockfile, audit result, and licence inventory are evidence; they do not replace source/provenance review or the release notice bundle.

For a committed candidate, run `pnpm release:reproducibility`, then create and verify the ignored local artifact receipt with `pnpm release:manifest` and `pnpm release:verify`. The receipt records source revision, lockfile digest, tool versions, and SHA-256 artifact entries; it is not a release signature.

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

## Phase 1 local evidence versus external gates

| Surface | Current local evidence | Still required before public support claim |
|---|---|---|
| Core/identity/persistence | Contract tests and Chromium user journeys cover the implemented flows, recovery, exclusivity, invitation replay, replacement, and disconnect sit-out. | Storage pressure, browser discard, long suspend, physical-device behavior, and fault injection on the final candidate. |
| Normal connectivity | Chromium journeys cover direct WebRTC after signaling, relay fallback, ticket binding, and reverse display pairing against a local service. | NAT/TURN, route loss/switch, service restart, load, TLS/reverse proxy, and representative networks. |
| Airplane | Generated `file://` artifact boots with no observed external request; local Chromium runs the two-way QR direct-WebRTC journey, local-only private reveal, wake-lock request, `pagehide` recovery-race regression, and closed-phone same-seat replacement. Host and joining-device scan controls request a live camera with saved-image fallback; two bundled live-frame decoders produced an answer QR in 10/10 repeated dense-offer inset-camera fixtures, and the desktop journey verifies a one-click offer enlargement above 500 px. Headless Mobile WebKit and GitHub-hosted Linux Chromium expose no usable local ICE interface, so GitHub records the three real direct-peer journeys as explicit environment skips rather than fabricated passes; they remain mandatory locally and in the physical-device release gate. | WAN-removed physical-device matrix, client isolation, real camera/file handling, 2–10 seats plus public display, and physical iPhone background/re-pair evidence. |
| Privacy | Automated card-projection, hostile-name, storage, diagnostics, relay, and artifact regressions pass. | The frozen-candidate four-pack Card Privacy Red Team and owner disposition of every finding. |
| Distribution | Normal/Airplane builds, reproducibility/provenance scripts, and a CI-gated GitHub Pages field-build path exist. | Clean-clone run, signature/provenance policy, published notices/SBOM, integrity substitution review, and owner-approved official-release receipt. |
| China | No local claim. | Dated representative network measurements and legal/operational review. |

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
