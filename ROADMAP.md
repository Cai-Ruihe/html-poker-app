# Roadmap

This roadmap is ordered by capability and evidence gates, not calendar dates. A phase is complete only when its specified journeys and security gates pass on the supported device/browser/network matrix.

## Foundation — implemented locally, publication pending

- Established modular product requirements, decision history, architecture records, contribution policy, governance, security policy, and release gates.
- Selected the strict TypeScript browser monorepo, browser baseline, test toolchain, and static Normal build in [ADR-0007](docs/adr/0007-typescript-browser-monorepo-toolchain.md).
- Added locked dependencies, automated documentation checks, contract tests, real-browser journey tests, and a clean-build CI workflow.
- Create the public GitHub repository only after private security/conduct contact channels and branch-protection ownership are configured.

## Phase 1 — Trusted-Host dealer (in development)

Verified locally in the first tracer slice:

- enforce the two-to-ten-seat authority range and exercise the two-seat local preview with a Web Crypto-shuffled hold'em hand;
- expose public and seat-scoped projections without placing another seat's cards in the public DOM;
- reveal flop, turn, and river; show a seat's cards; end a hand; and start the next hand;
- reject stale commands, preserve idempotent receipts, and withhold acknowledgement on persistence failure; and
- render responsive desktop and mobile-WebKit journeys with an automated accessibility scan.

The local preview deliberately uses an in-memory store and a trusted operator projection switcher. It is not evidence for seat authentication, refresh recovery, multi-device transport, physical iOS, Airplane Mode, hostile networks, or China operation.

Remaining Phase 1 outcome:

Deliver a browser dealer for in-person Texas Hold'em played with physical chips:

- host, player, Tablet Table, and TV Table modes;
- private hole-card delivery and public board progression;
- QR and equivalent full-URL joining;
- direct P2P, deployer private relay, and optional deployer cloud relay;
- preloaded standalone Airplane Mode over a private, non-isolating local Wi-Fi network;
- refresh/reconnect recovery, hand-end checkpoints, and manual diagnostic snapshot;
- explicit fold, show, muck, dealer movement, sit-out, and end-hand behavior; and
- redacted developer diagnostics with visible Hand ID and 30-day maximum retention.

Base release gates include hidden-card red teaming, host-refresh behavior, unsupported-browser handling, device/browser coverage, fault injection, and Airplane Mode journey tests. Measured operation on representative mainland-China networks is a separate gate for “China-ready” and equivalent claims; a plainly labeled general release may proceed without that claim when Airplane Mode passes and the online limitation is visible.

## Phase 2 — optional digital play-chip accounting

- Optional stacks, buy-ins, action timing, legal-action prompts, main/side pots, settlement confirmation, and correction events.
- Machine-readable hand histories and player/table summaries without exposing mucked or unrevealed cards.
- Remote Public Table View for people who cannot see the physical display.
- Revisit full remote human play only through pivot research because it changes latency, collusion, supervision, and continuity assumptions.

Release gates include property-based chip conservation, side-pot and all-in edge cases, explicit settlement confirmation, disconnect timing, privacy-safe export, and replay equivalence.

## Phase 3 — skins and AI training seats

- Validated, data-only community skins with replaceable cards, table styling, typography, and sound references.
- A provider-neutral SeatController interface for human and AI seats.
- Optional user-supplied API adapters and officially permitted local/subscription tooling adapters.
- Isolated AI Gateway on the user's own machine; AI remains optional and cannot receive other seats' private cards.
- Multiple AI play styles and reproducible training sessions where provider terms and privacy allow.
- A provider-neutral GTO Solver Adapter that supplies a truthfully labeled baseline before style-adjusted AI decisions.
- Post-hand replay/download showing the table timeline, solver result or unavailable status, style adjustment, bounded AI consideration note, and final action without exposing protected cards.

Release gates include non-executable skin validation, asset-rights review, accessibility and performance checks, AI prompt/projection isolation, provider failure behavior, cost disclosure, solver licence/accuracy/coverage evidence, deterministic privacy-safe replay/export, and proof that the base human game remains independent of AI.

## Recorded options, not scheduled commitments

- distributed Mental Poker to reduce trust in the host;
- automatic host migration;
- remote-first human games;
- tournaments and multi-table orchestration;
- multiple boards, additional betting structures, and other poker variants; and
- optional Bluetooth-assisted bootstrap where web-platform support becomes adequate.

These options reserve architectural seams. They must not appear as half-implemented production flags.
