# HTML Poker App

> A trusted-host digital dealer for in-person, play-chip-only Texas Hold'em.

HTML Poker keeps betting, chips, and conversation physical. A Trusted Host browser shuffles and deals; player phones receive only their own hole cards; a TV, public table, or tablet can show only public information. It is not an online gambling product, does not model money, and does not use player accounts.

## Phase 1 status

**Fact — implemented and automated locally.** The Phase 1 codebase supports two to ten player seats, one-use/revocable QR or link invitations, role-scoped Player/TV/Public Table/Tablet surfaces, private card projection, guarded hand lifecycle, show/muck/fold handling, correction/void controls, encrypted IndexedDB recovery, redacted local diagnostics, Normal Mode direct WebRTC with card-blind relay fallback, reverse display pairing, and a standalone two-way-QR Airplane artifact with in-page camera scanning and saved-image fallback.

**Fact — automated evidence.** Contract suites cover authority, identity, persistence, diagnostics, and relay isolation. Chromium journeys cover local dealing, player refresh/recovery, disconnect-to-sit-out, Normal direct/relay routes and reverse display pairing, plus standalone Airplane boot and pairing.

**Unknown — not a public release claim.** This local release candidate has not passed the required physical iOS/iPadOS, Android, TV, WAN-removal, hostile-network, Connection Service restart, or representative mainland-China matrices. It also has no GitHub remote, protected branch, release signature, or private vulnerability-reporting channel yet. Those are explicit release gates, not omissions hidden by a passing local suite.

See the [Phase 1 local release-candidate record](docs/releases/PHASE-1-LOCAL-RC.md) for the exact boundary between demonstrated evidence and remaining gates.

## Product constraints

- **Play chips only.** No money, payment, cash-out, rake, or gambling accounts.
- **Trusted Host.** The active host can inspect and manipulate the deck by design; encryption does not make a malicious or compromised host honest.
- **Card privacy first.** Other players, public surfaces, diagnostics, and the Connection Service do not receive unrevealed cards.
- **No required central poker engine.** Normal Mode prefers direct WebRTC, then an operator-owned private relay, then an optional operator-owned cloud relay. Airplane Mode has no internet dependency.
- **No player accounts.** A table-scoped credential restores a seat in the same browser; copied recovery links cannot open the same private seat simultaneously.
- **Quiet instrument, not casino UI.** Regular play stays on the table; uncommon administration lives in an off-table drawer.

## Quick start

Requires Node.js 24 and pnpm 11, pinned in [ADR-0007](docs/adr/0007-typescript-browser-monorepo-toolchain.md).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local address shown by Vite. With no relay URL configured, the app provides same-browser Normal development using the browser channel. Use a current, secure browser; the host preflight fails closed when its cryptography, persistence, projection, or exclusivity prerequisites are absent.

Build both distributable forms with:

```sh
pnpm build
```

- `dist/normal/` is the static Normal Mode build.
- `dist/airplane/poker-airplane.html` is the standalone Airplane file. Open the downloaded file itself, not a development server.

For actual multi-device Normal Mode and Airplane Mode instructions, see [Normal Mode operations](docs/operations/NORMAL-MODE.md) and [Airplane Mode operations](docs/operations/AIRPLANE-MODE.md).

## Verify a change

```sh
pnpm check
pnpm test:coverage
pnpm test:e2e
pnpm audit:prod
pnpm licenses:prod
```

Playwright browsers are installed separately:

```sh
pnpm exec playwright install chromium webkit
```

Check build determinism after a committed change with:

```sh
pnpm release:reproducibility
```

After a clean, committed worktree has built the artifacts, create and verify a local provenance manifest with:

```sh
pnpm release:manifest
pnpm release:verify
```

The manifest is generated under ignored `dist/release/`; it is a local receipt, not a release signature.

## Architecture and documentation

- [Master PRD](docs/prd/MASTER-PRD.md) and [Phase 1 PRD](docs/prd/phases/P1-TRUSTED-HOST-DEALER.md)
- [Phase 1 runtime architecture](docs/architecture/PHASE-1-RUNTIME.md)
- [Repository layout](docs/architecture/REPOSITORY-LAYOUT.md)
- [Quality gates](docs/quality/QUALITY-GATES.md)
- [Card Privacy automated red-team record](docs/security/PHASE-1-CARD-PRIVACY-RED-TEAM.md)
- [Release checklist](docs/releasing/RELEASE-CHECKLIST.md)
- [Contributing](CONTRIBUTING.md), [Security](SECURITY.md), and [Governance](GOVERNANCE.md)

The project is Apache-2.0 licensed. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the bundled `THIRD-PARTY-LICENSES.txt` for dependency/font notices.

## Open-source boundary

This repository is ready for review and a future open-source publication, but publication itself is intentionally not performed by this codebase. Creating a public GitHub repository, configuring branch protection, enabling private vulnerability reporting, choosing release signing, deploying a Connection Service, and publishing artifacts remain owner-controlled external operations.

Bold Poker is an interaction reference only. HTML Poker is not affiliated with or endorsed by Bold Poker, and its code, branding, artwork, and exact interface expression are not copied.
