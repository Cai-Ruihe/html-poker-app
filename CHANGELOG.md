# Changelog

All notable project changes will be documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and released versions will follow [Semantic Versioning](https://semver.org/) once a public application release exists.

## [Unreleased]

### Fixed

- Replaced the iPhone-only slide-to-peek gesture—which could accidentally publish a hand—with a one-tap **Reveal my cards privately** control, automatic cover on visibility loss, and a separate **Show cards to table** action.
- Serialized client recovery commits so overlapping table updates and `pagehide` cannot race into `Client recovery commit failed: revision-conflict`.
- Preserved a live client endpoint across restorable `pagehide` events and reconnect presence on `pageshow`, instead of converting every temporary mobile suspension into a forced disconnect.
- Removed unexplained red start-screen, board-rail, and moving cut-card ornaments that encoded no game state.
- Made dense Airplane offer QRs easier to scan with a one-click full-screen view, higher-resolution camera requests, and an independent bundled live-frame decoder fallback.

### Changed

- Bumped the visible Phase 1 build identity to `0.1.1-phase1`, added best-effort active-table screen wake locks, and verified Airplane replacement of a closed phone into the same active seat and cards.
- Added an owner-authorized GitHub Pages field-build deployment that runs only after the complete CI and browser journey gate succeeds.

### Added

- Complete Phase 1 trusted-host dealer slice: two-to-ten seat capabilities, one-use/revocable invitations, Player/TV/Public Table/Tablet projections, hand lifecycle controls, seat replacement/reorder/dealer relocation, void/correction records, encrypted recovery, and redacted diagnostics.
- Normal Mode route implementation with local browser channel, direct WebRTC after private signaling, card-blind private relay fallback, table-scoped four-hour relay tickets, host-side ticket renewal, and host-approved reverse display pairing.
- Standalone Airplane Mode artifact with fully bundled assets, restrictive offline CSP, two-way QR offer/answer pairing, local `iceServers: []` WebRTC, native saved-image detection plus bundled ZXing/jsQR fallbacks, and artifact request regression coverage.
- Phase 1 operations, runtime architecture, automated privacy-red-team, and local release-candidate records that distinguish demonstrated local evidence from device/network/release gates.
- Release provenance tooling for two-build artifact-digest reproducibility checks and a clean-worktree SHA-256 manifest.
- Modular Master, phase, and module PRD system with a machine-readable context manifest.
- Decision register, glossary, evidence index, and reusable PRD templates.
- Open-source contribution, security, governance, conduct, architecture-decision, quality, and release documentation.
- Deferred Phase 3 GTO-guided AI Trainer, style-transformation trace, and privacy-safe post-hand replay/export requirements.
- Strict TypeScript pnpm workspace with React, Vite, Vitest, Playwright, ESLint, Prettier, locked dependencies, and continuous-integration checks.
- Phase 1 local create/deal/show/end tracer slice with Web Crypto shuffling, role projections, typed command receipts, command idempotency, and persist-before-ack behavior.
- Responsive trusted-host table preview with public and seat-scoped views, bundled fonts, keyboard-visible controls, automated accessibility checks, and public-DOM privacy assertions.
- Automated documentation manifest, link, identifier, relationship, and document-budget validation.
- Workspace-boundary lint rules, peer-dependency checks, production dependency auditing, and weekly Dependabot configuration.
- Immutable commit pins for third-party GitHub Actions used by continuous integration.
- A production-artifact third-party licence bundle covering React and the bundled OFL fonts.

### Security

- Replaced static relay credential configuration with URL-only deployment configuration; a host operator token mints a table-scoped ticket locally and is not placed in player links.
- Added encrypted reverse-display pairing responses, relay table/host/protocol binding, relay-ticket expiry/renewal behavior, and browser evidence for direct/relay route behavior.
- Documented the Phase 1 Trusted Host limitation and mandatory Card Privacy Red Team gate.
- Kept custody state out of presentation interfaces and added negative tests for cross-seat and public projection leakage.
- Made custody state opaque outside its owning module, isolated projection arrays from authoritative state, required active Hand IDs on hand-scoped commands, rejected post-completion exposure, and made storage exceptions fail closed.
- Replayed the committed receipt for concurrent retries carrying the same idempotency key.
- Added browser red-team regression coverage for hostile names, cross-seat/public DOM isolation, transient browser storage, and runtime page errors.
- Added a restrictive static Content Security Policy and no-referrer policy for the Normal preview; deployment headers remain a release concern.
