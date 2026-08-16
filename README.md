# HTML Poker App

> A trusted-host table companion for in-person, play-chip-only Texas Hold'em.

HTML Poker lets a table keep physical chips or select an in-development Digital Chips profile. A Trusted Host browser owns the shuffle, deal, and authoritative play-chip ledger; player phones receive only their own hole cards and legal actions; a TV, public table, or tablet receives only public information. It is not an online gambling product, does not model money, and does not use player accounts.

## Phase 2 status

**Fact — first tracer implemented, explicitly experimental.** The repository can
create an optional two-player Digital Chips table and complete one hand: post
blinds, accept exact check/call/bet/raise/fold/all-in intents, advance the board
from committed betting rounds, recover the host mid-hand, propose a derived
settlement, and update stacks only after host confirmation. Late new seats and
a second hand fail closed. The selector is absent from the normal Phase 1 party
path and appears only with `?experimental=digital-chips`.

**Fact — deliberately incomplete.** Multiway short-all-in hardening, complex
side pots, top-ups/re-entry, dealer rotation, corrections, privacy-filtered
history export, property/differential testing, Airplane/device verification,
and release qualification remain open. It is development evidence, not a Phase
2 release or party-readiness claim.

See the [Phase 2 accounting architecture](docs/architecture/PHASE-2-ACCOUNTING.md) and [research foundation](docs/research/PHASE-2-ACCOUNTING-FOUNDATION.md).

## Phase 1 status

**Fact — implemented and automated locally.** The Phase 1 codebase supports two
to ten player seats, one-use/revocable QR or link invitations, role-scoped
Player/TV/Public Table/Tablet surfaces, private card projection, guarded hand
lifecycle, simple Show/Fold handling, three synchronized dark table themes,
four-sided Tablet controls, correction/void controls, encrypted IndexedDB
recovery, foreground reconnect with an explicit fallback action, redacted local
diagnostics, Normal Mode direct WebRTC with card-blind relay fallback, reverse
display pairing, and a standalone two-way-QR Airplane artifact with in-page
camera scanning and saved-image fallback.

**Fact — automated evidence.** Contract suites cover authority, identity, persistence, diagnostics, and relay isolation. Chromium and Mobile WebKit journeys cover a host joining its own table, switching among host/private/tablet views, player refresh/recovery, and disconnect-to-sit-out. Chromium additionally covers Normal direct/relay routes, reverse display pairing, stale-link diagnosis and ticket refresh after a service restart, plus standalone Airplane boot and pairing.

**Unknown — not a public release claim.** This local release candidate has not passed the required physical iOS/iPadOS, Android, TV, WAN-removal, hostile-network, already-connected-client survival across a Connection Service restart, or representative mainland-China matrices. Public source, Private Vulnerability Reporting, and a CI-gated field build do not replace protected branch rules, release signing, or the remaining device/network evidence. Those are explicit release gates, not omissions hidden by a passing local suite.

See the [Phase 1 local release-candidate record](docs/releases/PHASE-1-LOCAL-RC.md) for the exact boundary between demonstrated evidence and remaining gates.

## Same-Wi-Fi party build

The owner-authorized field build is published from `main` only after the configured CI and browser journey gates pass. GitHub's hosted Linux runner cannot expose a local ICE interface, so the three real Airplane peer-to-peer journeys remain mandatory local tests and are explicit hosted-CI skips rather than claimed passes:

**https://cai-ruihe.github.io/html-poker-app/**

Open that exact HTTPS address on the host and every iPhone, confirm **Build
0.1.3-phase1**, and create a fresh table. This removes copied-file version drift
and gives the in-page QR scanner a normal secure web origin. Use **Enlarge QR**
before each phone scans the laptop's offer. The page still uses Airplane Mode's
local, serverless WebRTC path after it loads; GitHub Pages does not receive cards
or table messages.

For the short operating sequence and phone-replacement recovery, use the [Airplane Mode party runbook](docs/operations/AIRPLANE-MODE.md#same-wi-fi-party-setup).

## Normal Mode field deployment

The owner-authorized Normal field build is published at:

**https://cai-ruihe.github.io/html-poker-app/normal/**

Normal Mode uses ordinary one-use invitation links/QRs and a card-blind Connection Service. The current field service runs on the owner's laptop through an outbound TLS tunnel, so the laptop and its container runtime must remain awake. The operator token stays outside the repository and public site. This temporary service has no uptime guarantee; it is not the later permanent deployment claim.

If the host phone or iPad is also playing, choose **Join my own table on this
device** before dealing and use **Host Controls**, **My Hand**, and **Table
View** in the same page. iOS may pause the host while another app is foreground;
the host and clients attempt authenticated catch-up when Safari returns, with a
visible **Reconnect to table** fallback. This is foreground recovery—not
background execution. The ordinary player QR/link is for other devices.

See [Normal Mode operations](docs/operations/NORMAL-MODE.md) for the host flow, service boundary, and restart procedure.

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
- [Shared visual system](docs/design/SHARED-VISUAL-SYSTEM.md)
- [Quality gates](docs/quality/QUALITY-GATES.md)
- [Card Privacy automated red-team record](docs/security/PHASE-1-CARD-PRIVACY-RED-TEAM.md)
- [Release checklist](docs/releasing/RELEASE-CHECKLIST.md)
- [Contributing](CONTRIBUTING.md), [Security](SECURITY.md), and [Governance](GOVERNANCE.md)

The project is Apache-2.0 licensed. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the bundled `THIRD-PARTY-LICENSES.txt` for dependency/font notices.

## Open-source boundary

The source is public under Apache-2.0 at **https://github.com/Cai-Ruihe/html-poker-app**. Private Vulnerability Reporting, dependency alerts, and automatic security fixes are enabled for that repository. The Pages party build is an explicitly labelled field build; protected branch rules, release signing, an official versioned release, and any Connection Service deployment remain separate owner-controlled gates.

Bold Poker is an interaction reference only. HTML Poker is not affiliated with or endorsed by Bold Poker, and its code, branding, artwork, and exact interface expression are not copied.
