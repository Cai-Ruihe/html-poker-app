# Decision register

This is the searchable source of settled product choices. Load rows by ID rather than loading the full file for ordinary tasks. Status meanings are defined in [the PRD system guide](../README.md).

## Product and governance

| ID | Decision | Status | Owner |
|---|---|---|---|
| SCOPE-PLAY-MONEY | Social Texas Hold'em only; digital chips have no money value, payment, cash-out, or rake. | locked | PRD-000, M10 |
| PHASE1-DEAL-ONLY | Phase 1 replaces the deck/dealer. Bet amounts, calls/checks/raises, blind posting, stacks, pots, and settlement remain physical/off-app; fold/show/muck/street/hand lifecycle remains in-app. | locked | P1, M01 |
| PHASE1-TABLE-SIZE | Support 2–10 player seats per table, in addition to the Trusted Host authority and at least one Public Table device. | research-default | P1, M03, M05, M06 |
| GOV-LICENCE | Project code uses Apache-2.0; commercial use and forks are allowed subject to notices. | locked | M09 |
| GOV-OFFICIAL-CORE | Anyone may propose changes; only Ruihe approves Official Core changes and Official Releases. | locked | M09 |
| GOV-COMMUNITY-SKINS | Official-repository Community Skins are welcome but remain data-only. | locked | M11 |
| GOV-CUSTOM-HOST | Official clients may join compatible Custom Hosts after a clear unverified-host warning. | locked | M03, M09 |
| GOV-NO-ACCOUNTS | No required managed account system; identity is room-scoped. | locked | M03 |
| GOV-RED-TEAM | Every phase includes an independent Card Privacy Red Team check; no perfect-security or human-audit claim. | locked | M08 |
| GOV-PRIORITY | Hidden-card confidentiality is the floor; within it, Airplane Mode, China operation, and robustness outrank exotic security protocols. | locked | M02, M05 |

## Authority and core architecture

| ID | Decision | Status | Owner |
|---|---|---|---|
| AUTH-TRUSTED-HOST | One active host owns Phase 1 game truth and readable card custody. | locked | M01, M02 |
| AUTH-FUTURE-MENTAL-POKER | Preserve a replaceable Card Custody seam for a future separately reviewed host-blind option. | locked | M02 |
| AUTH-HOST-DEATH | Permanent host loss may end a Phase 1 game; automatic host migration is not promised. | locked | M07 |
| AUTH-HOST-CAN-PLAY | The host operator may join from another device as an ordinary player. | locked | M03 |
| ARCH-SHARED-CORE | Normal/Airplane modes and all presentations share one core with replaceable adapters. | locked | M01 |
| RULES-VERSIONED-PROFILE | Each table pins one supported, versioned Rules Profile; unsupported combinations fail before play. | research-default | M01 |
| PHASE1-ONE-TABLE-PER-HOST | One Trusted Host runtime owns one table; a card-blind Connection Service may multiplex isolated tables. | research-default | M01, M04 |
| AUTHORITY-PERSIST-BEFORE-ACK | Commit custody, events, revision, and idempotency receipt atomically before success or irreversible projection. | research-default | M01, M07 |
| ARCH-TOOLCHAIN | Phase 1 uses ESM-only strict TypeScript, Node.js 24 LTS, pnpm workspaces, React/Vite presentation, Vitest module tests, and Playwright journeys; authority packages remain DOM/framework-free. | research-default | ADR-0007 |

## Connectivity and distribution

| ID | Decision | Status | Owner |
|---|---|---|---|
| SERVER-CONNECTION-ONLY | Windows/Mac or cloud services may signal, relay, store opaque backups, and retain redacted diagnostics, but never run poker rules or receive card plaintext/keys. | locked | M04 |
| NET-ROUTE | Normal Mode tries direct P2P, then the deployer's private relay, then its optional cloud relay. | locked | M04 |
| NET-OWNER-ISOLATION | Every deployer configures and pays for its own infrastructure; Ruihe's accounts are never public defaults. | locked | M04, M09 |
| NET-BOOTSTRAP | QR plus the equivalent full URL is the universal Normal Mode bootstrap. | locked | M03, M04 |
| NET-DISPLAY-REVERSE-QR | In Normal Mode, an awkward-input display may show an ephemeral pairing QR for an authorized host/admin device to scan; signaling returns the response, and the granted role never includes cards or a silent authority upgrade. | research-default | M03, M04, M06 |
| NET-HOST-KEY-BINDING | Invitations bind table, active host key, role, protocol, expiry, and nonce independently of signaling, without a comparison prompt. | research-default | M03, M04 |
| NET-BLUETOOTH | Bluetooth is only an optional future bootstrap enhancement. | deferred | M05 |
| JOIN-MANUAL-CODE | Typed-code, pairing-file, and copy/paste bootstrap paths are archived/deferred; reopen only after a material QR capability failure. | deferred | M03, M05 |
| NET-AIRPLANE | Airplane Mode uses preloaded standalone HTML, private non-isolating Wi-Fi, two-way on-screen QR, and no external services. | locked | M05 |
| NET-CHINA | China-ready operation is a goal; do not claim it until field-tested. Airplane Mode is the fallback. | locked | M04, M05 |
| NET-VERSION | Peers negotiate compatibility before joining; a live table never changes build/protocol mid-game. | locked | M04, M09 |
| DIST-STATIC-HTTPS | Normal Mode ships as a static HTTPS application on a replaceable deployer-selected host; GitHub Pages or another free tier may be evaluated, but no provider is a poker engine or China-readiness assumption. | research-default | M09 |
| SUPPLYCHAIN-IMMUTABLE-RELEASE | Official Normal/Airplane builds are immutable, self-contained, dependency-locked artifacts with provenance and no runtime third-party code. Updates activate only between tables. | research-default | M09 |
| HOST-CAPABILITY-PREFLIGHT | Before table creation, the host browser must pass the required security, storage, transport, and presentation capability checks for the selected mode; unsupported combinations fail before dealing. | research-default | P1, M09 |

## Joining, identity, and recovery

| ID | Decision | Status | Owner |
|---|---|---|---|
| JOIN-WINDOW | Possession of an active high-entropy player invitation during the Join Window permits joining without per-player approval. | locked | M03 |
| JOIN-SEAT-CREDENTIAL | Each player receives a unique revocable Seat Credential; names are not identity. | locked | M03 |
| JOIN-MID-HAND | New devices wait until the next hand; recovery of an existing seat is distinct. | locked | M03, M01 |
| PLAYER-ONE-PRIVATE-CLIENT | One active private browser instance per seat; replacement rotates the old credential. No anti-collusion/one-human-one-device claim. | research-default | M03 |
| RECOVERY-PLAYER | Refresh, power loss, or route change resumes the same seat when its credential survives. | locked | M03, M07 |
| RECOVERY-DISCONNECT-SIT-OUT | A player disconnected past current-hand end is sitting out for future hands. | locked | M03, M07 |
| RECOVERY-HOST-REFRESH | Same-browser host refresh recovers only after exclusive authority is proved; otherwise pause/fail closed. | locked | M07 |
| BACKUP-HAND-END | Optional encrypted checkpoint after explicit hand end; remove mucked/unrevealed cards and completed-hand custody material. Manual Save Log remains available. | locked | M07 |
| BACKUP-NO-BATTERY | Correctness never depends on the Battery API or a below-10-percent trigger. | locked | M07 |
| KEY-SEPARATION-RECOVERY | Identity, seat, envelope, vault, remote-recovery, service, AI, and diagnostic secrets are purpose-separated; remote ciphertext does not escrow its recovery material. | research-default | M02, M07 |

## Interaction and hand lifecycle

| ID | Decision | Status | Owner |
|---|---|---|---|
| MODE-SEPARATION | Player, Tablet, TV, Public Table, and Developer experiences are distinct projections/presentations. | locked | M06 |
| MODE-TABLE-CONTROL | A device with a valid Table-Control Capability may switch to Tablet Mode without first-use approval; Public/display authority cannot self-upgrade or see cards. | locked | M03, M06 |
| SEAT-AUTO-AND-DRAG | Auto-assign seats and allow visual positions to move during play without changing logical order. | locked | M03, M06 |
| DEALER-RELOCATION | Separate administration changes the logical dealer seat without dealing or posting blinds. | locked | M01, M06 |
| FOLD-UNDO | Fold has a visible five-second undo window ending earlier at the first dependent irreversible progression. | locked | M01, M06 |
| FOLD-SIT-OUT | A folded player may already choose sitting out for future hands. | locked | M03, M06 |
| SHOW-IRREVERSIBLE | Full Show permanently reveals/records cards; only the player's local screen may flip them down, while Public Table keeps them shown until next hand. | locked | M02, M06 |
| SHOWDOWN-CONCEDE | One contender may show while others fold/muck/concede without revealing; never wait for every contender to show. | locked | M01, M02 |
| HAND-END-EXPLICIT | No hand ends automatically, including all-fold; a guarded explicit action ends it after physical settlement. | locked | M01, M06 |
| CORRECTION-LIVE-EVENTS | Accepted history is append-only; corrections name actor, reason, and corrected event IDs and cannot restore disclosed secrecy. | research-default | M01, M07 |
| CORRECTION-DEAL-REPAIR | Reject invalid pre-commit deals; repair early misdeals explicitly; record premature public cards as exposed and safely repair/redeal or void. | research-default | M01, M02 |
| UI-MINIMAL-RUNNING | Ordinary in-hand UI remains minimal and mode-specific; administration stays off the 99-percent surface. | locked | M06 |
| UI-AESTHETIC | Default style is classic and elegant; Bold Poker inspires behavior only, never copied art or exact UI. | locked | M06, M11 |
| UI-BUTTON-ARRANGEMENT | Exact button count/placement and End Hand gesture wait for interaction prototypes. | soft-set | M06 |

## Privacy, diagnostics, and later phases

| ID | Decision | Status | Owner |
|---|---|---|---|
| PRIVACY-PROJECTIONS | Public/control/other-seat devices receive filtered state; hidden cards are never merely CSS-hidden. | locked | M02 |
| PRIVACY-TRUST-CLAIM | Signaling, relay, checkpoint, diagnostic, display, and other seats never receive hidden-card plaintext; Phase 1 does not protect against the active Trusted Host. | locked | M02 |
| PRIVACY-ZERO-TELEMETRY | No runtime analytics/crash telemetry outside explicitly enabled, redacted Developer Mode. | research-default | M08, M09 |
| DIAGNOSTICS-30-DAYS | Developer Mode shows a long Hand ID and optionally stores allowlisted redacted logs for 30 days. | locked | M08 |
| DIAGNOSTIC-HAND-ID | Generate a time-sortable, CSPRNG-backed UUIDv7 Hand ID; reject a duplicate in the local table/history scope and describe it as collision-resistant, not mathematically never-repeating. | research-default | M08 |
| ACCOUNTING-PHASE-2 | Optional play-chip actions, balances, buy-ins, settlement, and histories belong to Phase 2. | deferred | M10 |
| PHASE2-NLHE-HOME-SESSION | First digital profile is single-table, play-chip No-Limit Hold'em home-session play. | research-default | P2, M10 |
| REMOTE-PUBLIC-TABLE-P2 | Remote Public Table View belongs to Phase 2 with the seam reserved now. | deferred | P2, M06 |
| REMOTE-HUMAN-PLAY | Full remote human play requires Phase 2 digital actions and a fresh remote-first pivot; internet transport alone does not enable it. | deferred | P2 |
| TOURNAMENT-MULTITABLE-VARIANTS | Tournament, multi-table, multiple-board, other betting structures, and other poker games are outside the roadmap until explicitly reopened. | deferred | PRD-000 |
| SKINS-PHASE-3 | Implement Community Skins in Phase 3; reserve the data-only seam from the start. | deferred | M11 |
| AI-PLAYER-PHASE-3 | Phase 3 adds optional multiple provider/model/style-controlled AI training seats after machine-readable Phase 2 actions exist. | deferred | M12 |
| AI-CLOUD-TRUST | Remote AI sees its own seat's cards only after an explicit Phase 3 owner disclosure gate. | deferred | M12 |
| AI-ACCESS-DUAL-PATH | Keep API/BYOK access alongside any officially permitted subscription adapter; never silently fall back to paid API/overage. | locked | M12 |
| AI-SEAT-ADAPTER | Human and AI controllers share a seat-scoped proposal interface; Game Core revalidates every action. | research-default | M01, M12 |
| AI-BYOK-GATEWAY | Long-lived provider credentials stay in a deployer-owned AI Gateway, never static HTML, peer messages, Connection Service, or logs. | research-default | M12 |
| AI-PROVIDER-TRUST-DOMAIN | Default to at most one live remote AI seat per provider trust domain; local trusted models may control multiple seats. | research-default | M12 |
| AI-GATEWAY-COLOCATION | Connection Service and AI Gateway may share a Windows/Mac only as separate least-privilege processes, secrets, state, and logs. | locked | M04, M12 |
| AI-OPTIONAL-DEGRADATION | Human, China, and Airplane play never depend on AI; offline AI requires a local adapter and cloud cards are never queued for later upload. | research-default | M12 |
| AI-GTO-TRAINER | Phase 3 AI Trainer uses a provider-neutral GTO Solver Adapter as an input to each recorded AI training decision, then applies the selected Play Style Profile before Game Core validates the final proposal; every training hand records solver coverage or an explicit unavailable status. | locked | M12 |
| AI-GTO-SOLVER-SELECTION | Phase 3 research first evaluates lawful, automation-capable free online solvers, then inspected open-source local solvers when online options are unsuitable; the exact engine, exact/approximate method, caching, hardware, latency, and deployment remain deferred. | deferred | M12 |
| AI-TRAINING-REPLAY | After a training hand ends, the user can replay or export a versioned privacy-filtered record linking the table timeline, solver result/status, style adjustment, final action, and a bounded user-facing AI consideration note; it never claims or stores a provider's private chain-of-thought. | locked | M12 |

## Test gates — do not ask as preferences

| ID | Required evidence | Owner |
|---|---|---|
| TEST-TV-BROWSERS | Selected TV browser lifecycle/input/capability matrix. | M06 |
| TEST-IOS-STANDALONE | Real iOS/iPadOS standalone file, camera, storage, and resume tests. | M05, M09 |
| TEST-CHINA-NETWORKS | Representative mainland fixed/mobile/hotel/private/cloud relay measurements. | M04 |
| TEST-WEBRTC-STAGING | Direct/private/cloud fallback, ICE restart, and network-switch spike. | M04 |
| TEST-HOST-EXCLUSIVITY | Fault tests proving two host writers cannot resume. | M07 |
| TEST-STORAGE-KEYS | Browser/OS key persistence, clearing, encryption, and recovery attacks. | M02, M07 |
| TEST-CORRECTION-REPLAY | Crash, duplicate, race, idempotency, replay, digest, privacy, and quota matrix. | M01, M07 |
| TEST-UPDATE-SUPPLY-CHAIN | Artifact substitution, downgrade, mixed versions, worker activation, and incompatible Airplane builds. | M09 |
| TEST-REMOTE-COMPROMISE | Threat model, fuzzing, dependency review, Red Team, process isolation, and penetration evidence. | M08 |
| TEST-RULES-PROFILE | No invented Phase 1 chip state, compatible versions, correct digital street authority, and cross-table isolation. | M01, M10 |
| TEST-ACCOUNTING | Legal actions, chip conservation, side pots, ties, odd chips, settlement corrections, and exports. | M10 |
| TEST-AI-PROVIDER-ACCESS | Dated provider/product/model/region/poker policy and credential eligibility matrix; ambiguity stays disabled. | M12 |
| TEST-AI-SEAT-SAFETY | Projection, cross-seat, injection, stale response, legality, timeout, logging, and cost tests. | M12, M08 |
| TEST-AI-STYLE-QUALITY | Reproducible reliability, cost, strength, and style-differentiation benchmarks. | M12 |
| TEST-AI-CHINA-LOCAL | Representative China cloud-provider and local-model/Airplane hardware tests. | M12 |
| TEST-AI-GTO-TRAINER | Solver licence/API or local-build eligibility, accuracy labeling, per-decision coverage, latency/cost, failure handling, style transformation, privacy, and deterministic replay/export round-trip. | M12 |
| TEST-SKINS | Schema/malicious-package fuzzing, non-executability, asset rights, accessibility, performance, and deterministic fallback. | M11 |
| TEST-MENTAL-POKER | Separate protocol, performance, dropout, collusion, and independent cryptographic review. | M02 |
