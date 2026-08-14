# HTML Poker App

> Working title. A browser-based Texas Hold'em table for social, play-chip-only games.

This project aims to bring the low-attention, in-person experience of a dedicated poker dealer app to any modern browser. Phones may hold private cards, while a tablet, television, or computer presents the public table. It is designed for ordinary internet use and for a preloaded, local-network **Airplane Mode**.

Phase 1 is now **in development**. A tested two-seat local preview can deal private hole cards, reveal the board, show a seat's cards, end a hand, and start the next one; the authority boundary already enforces the Phase 1 two-to-ten-seat range. It is not a release: joining, credentials, networking, durable recovery, Airplane Mode, and China-readiness evidence are not implemented yet.

## Product principles

- **Play chips only.** No money, payment, cash-out, rake, or gambling accounts.
- **Private cards first.** A device receives only the private information its role needs.
- **Honest trust model.** Phase 1 trusts the active host; it does not claim protection from a malicious or compromised host.
- **Robust local play.** Airplane Mode, China operation, and recovery are explicit test gates.
- **No mandatory central poker engine.** Normal connectivity tries direct peer-to-peer, then deployer-owned private relay, then an optional deployer-owned cloud relay.
- **No player accounts.** Table-scoped credentials restore a seat after refresh or temporary disconnection.
- **Quiet table UI.** Common play stays simple; uncommon administration lives away from the main surface.
- **Replaceable edges.** Presentation skins, transport, persistence, accounting, and future AI seats have narrow module boundaries.

## Roadmap

| Phase | Intended outcome | Status |
|---|---|---|
| 1 | Trusted-host digital dealer used with physical chips; Normal and Airplane modes | In development |
| 2 | Optional digital play-chip accounting, history, and remote public-table viewing | Reserved |
| 3 | Data-only community skins and optional provider-neutral AI training players | Reserved |

See [ROADMAP.md](ROADMAP.md) for gates rather than date promises.

## Start here

- Product direction and document router: [Master PRD](docs/prd/MASTER-PRD.md)
- Minimal-context loading instructions: [PRD system guide](docs/prd/README.md)
- Document and architecture map: [docs/README.md](docs/README.md)
- Planned source ownership: [repository layout](docs/architecture/REPOSITORY-LAYOUT.md)
- Design decisions: [ADR index](docs/adr/README.md)
- Contribution rules: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security model and private reporting: [SECURITY.md](SECURITY.md)
- Bundled dependency and font notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)

Agents and contributors should not load every PRD. Use [docs/prd/manifest.yaml](docs/prd/manifest.yaml) to select one phase, one primary module, and only the dependencies relevant to the task.

## Run the local preview

Prerequisites are Node.js 24 and pnpm 11, as recorded in [ADR-0007](docs/adr/0007-typescript-browser-monorepo-toolchain.md).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local address printed by Vite. This preview intentionally lets one trusted operator switch among the public and seat projections so the projection boundary can be tested on one device; it is not a player-authentication model.

Run the repository checks with:

```sh
pnpm check
```

For the real-browser journey tests, install the pinned Playwright browsers once and run:

```sh
pnpm exec playwright install chromium webkit
pnpm test:e2e
```

## Security reality

Phase 1 is a **Trusted Host** design. Encryption protects card data in transit, at rest, in diagnostics, and from unauthorized peer roles. It cannot prevent the host process, a compromised host device, or a modified official-looking build from seeing or manipulating the deck. A future distributed “Mental Poker” design is recorded as a separate option, not a present guarantee.

Do not report a card-privacy vulnerability in a public issue. Follow [SECURITY.md](SECURITY.md).

## Open-source model

The project is licensed under [Apache License 2.0](LICENSE): forks, modification, redistribution, and commercial use are allowed under its terms. The project owner controls what is merged and released from the official repository; independent forks do not become “Official Core” merely by reusing the code. See [GOVERNANCE.md](GOVERNANCE.md).

## Inspiration and independence

Bold Poker is an interaction reference because of its compact, physical-table-oriented flow. This project is not affiliated with or endorsed by Bold Poker. Its code, artwork, branding, and exact interface expression must not be copied.

## Project status

Facts today:

- the modular PRD and architecture-document structure exists;
- the strict TypeScript, React, Vite, Vitest, and Playwright toolchain is selected in [ADR-0007](docs/adr/0007-typescript-browser-monorepo-toolchain.md);
- the first local create/deal/show/end vertical slice has contract and browser-journey evidence;
- this durable folder is a local Git repository with no configured public remote;
- the current authority store is memory-only, so refresh/recovery is not yet supported; and
- release security, physical-device compatibility, networking, Airplane Mode, and China-readiness claims remain unverified until their named gates pass.

## Licence

Copyright 2026 Ruihe Cai. Project-owned code and documentation are licensed under the [Apache License, Version 2.0](LICENSE), except [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), which is an attributed Contributor Covenant adaptation under CC BY-SA 4.0. See [NOTICE](NOTICE).
