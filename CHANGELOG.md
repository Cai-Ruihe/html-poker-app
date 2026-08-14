# Changelog

All notable project changes will be documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and released versions will follow [Semantic Versioning](https://semver.org/) once a public application release exists.

## [Unreleased]

### Added

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

- Documented the Phase 1 Trusted Host limitation and mandatory Card Privacy Red Team gate.
- Kept custody state out of presentation interfaces and added negative tests for cross-seat and public projection leakage.
- Made custody state opaque outside its owning module, isolated projection arrays from authoritative state, required active Hand IDs on hand-scoped commands, rejected post-completion exposure, and made storage exceptions fail closed.
- Replayed the committed receipt for concurrent retries carrying the same idempotency key.
- Added browser red-team regression coverage for hostile names, cross-seat/public DOM isolation, transient browser storage, and runtime page errors.
- Added a restrictive static Content Security Policy and no-referrer policy for the Normal preview; deployment headers remain a release concern.
