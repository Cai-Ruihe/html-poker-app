# Evidence index

Load this file only for architecture, security, provider-policy, or disputed-default work. It is an evidence router, not a substitute for rechecking time-sensitive sources.

## Product precedents

- [Bold Poker product](https://boldpoker.net/) and [help](https://boldpoker.net/help): deal-only physical-table model, phone-private cards, public iPad board, peek/fold/show interactions, physical chips, up to ten players.
- [Smart Dealer Poker](https://smartdealer.poker/): browser public table, private player phones, host-can-play, digital accounting and restart persistence.
- [Cardamoo](https://cardamoo.com/): no-login shared screen, QR pairing, digital betting, replays, skins, and result explanations.
- [Poker Now](https://www.pokernow.club/): browser links, guest play, histories, spectator/owner controls, and online-table trade-offs.
- [Poker TDA rules](https://www.pokertda.com/view-poker-tda-rules/): live-poker misdeal, premature-card, exposure, and substantial-action procedures. These are transferable principles, not mandatory home-game rules.

## Protocol and browser foundations

- [RFC 8827 — WebRTC Security Architecture](https://www.rfc-editor.org/rfc/rfc8827.html): browser trust and signaling/identity considerations.
- [RFC 8831 — WebRTC Data Channels](https://www.rfc-editor.org/rfc/rfc8831.html): SCTP over DTLS data-channel transport.
- [RFC 9562 — UUIDs](https://www.rfc-editor.org/rfc/rfc9562.html): UUIDv7 time ordering, randomness, monotonicity, and the boundary that true global uniqueness is not mathematically guaranteed without shared knowledge.
- [W3C WebRTC](https://www.w3.org/TR/webrtc/): browser interface and application-defined signaling.
- [W3C IndexedDB](https://www.w3.org/TR/IndexedDB/): transactional local persistence.
- [W3C Service Workers](https://www.w3.org/TR/service-workers/): installing/waiting/active update lifecycle.

## Security and release practice

- [NIST Secure Software Development Framework](https://csrc.nist.gov/pubs/sp/800/218/final): dependency, integrity, provenance, and lifecycle controls.
- [SLSA provenance](https://slsa.dev/spec/v1.2/provenance): artifact-to-build provenance.
- [The Update Framework](https://theupdateframework.github.io/specification/): rollback, freeze, mix-and-match, and key-compromise update threats.
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) and [Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html): bearer capabilities and purpose-limited secrets.

## Open-source governance practice

- [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0.txt): the controlling licence text for copyright, patent, redistribution, NOTICE, contribution, and trademark boundaries.
- [Contributor Covenant 2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct.html) and its [current adoption/licence notice](https://www.contributor-covenant.org/adopt/): the attributed CC BY-SA 4.0 base for the project Code of Conduct.
- [GitHub private vulnerability reporting](https://github.com/Cai-Ruihe/our-poker-table/security/advisories/new): the active private disclosure channel for the public repository.

## Open-source and academic references

- [PokerKit](https://github.com/uoftcprg/pokerkit): explicit rules profiles, deterministic operations/history, and multivariant poker modeling.
- [Poki netlib](https://github.com/poki/netlib): reconnect/transport behavior worth evaluating behind a replaceable adapter; not an accepted dependency.
- [DeepStack](https://doi.org/10.1126/science.aam6960) and [Pluribus](https://doi.org/10.1126/science.aay2400): exact-game AI evaluation and the limits of generic poker claims.
- [Mental poker, Shamir–Rivest–Adleman](https://people.csail.mit.edu/rivest/pubs/SRA81.pdf): foundational host-blind card-dealing direction and its additional complexity.

## Evidence boundary

No cited product proves this complete architecture. China connectivity, browser/device support, implementation security, provider policy, and AI quality are time-sensitive Test Gates. Refresh first-party sources whenever a decision's recorded trigger fires.
