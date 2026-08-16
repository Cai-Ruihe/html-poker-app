# Field feedback ledger

Stable IDs preserve owner feedback independently of conversation context. `qa-registry.yaml` assigns every row an automated and/or physical evidence route.

| ID | Requirement | Release disposition |
|---|---|---|
| `AIRPLANE-QR-USABLE-001` | Airplane QR must encode usable pairing data, render at scannable density, enlarge cleanly, and use the in-page scanner. | Phase 1 blocker |
| `AIRPLANE-CAMERA-001` | Host and joining devices, including laptops, can invoke a camera and saved-image fallback when a QR answer must be scanned. | Phase 1 blocker plus physical gate |
| `AIRPLANE-VISUAL-NOISE-001` | Remove unexplained red lines, bars, and decorative artifacts. | Covered by TUI and visual baselines |
| `PRIVATE-REVEAL-001` | Private cards use an explicit reveal/hide interaction; the former unusable slide-to-peek behavior does not return. | Phase 1 blocker |
| `RECOVERY-REVISION-001` | Revision conflicts and close/reopen flows recover safely without routine user repair. | Phase 1 blocker |
| `TOKEN-PORTABILITY-001` | A deployer can store the private host token in a password manager and retrieve it away from home without publishing it. | Operational documentation |
| `RELAY-STALE-LINK-001` | A stale or restarted relay produces actionable recovery and fresh-link guidance, not a generic dead end. | Phase 1 blocker plus field gate |
| `HOST-PLAYER-SAME-DEVICE-001` | Host can join an ordinary player seat and switch to My Hand without authority/card leakage. | Phase 1 blocker |
| `HOST-TABLE-SAME-DEVICE-001` | Host/iPad can switch quickly to the public Tablet view without minting authority. | Phase 1 blocker |
| `MUCK-REMOVED-001` | Current UI exposes Fold only; no separate Muck action. | Phase 1 blocker |
| `RECOVERY-FOREGROUND-001` | Host, Player, Tablet, TV, and Public roles automatically catch up on foreground/online/focus and retain an explicit reconnect path. | Phase 1 blocker plus physical gate |
| `TABLET-FOUR-CORNERS-001` | Equal corner launchers serve every side; upper controls face upper seats. | Covered by TUI-015, TUI-029, TUI-030 |
| `TABLET-CARD-FIRST-001` | Quiet Tablet view gives almost all visual attention to large community cards and low-key state. | Covered by TUI-001–003 and TUI-020–023 |
| `TABLET-CONTROLS-001` | Quick controls contain only Next Card, guarded Next Hand, icon-only dots, and Close; early hand end is supported. | Covered by TUI-004–019 |
| `TABLET-THEMES-001` | Dark Green, Black Gold, and Deep Navy share geometry and synchronize across all players/displays. | Phase 1 blocker |
| `JOIN-DEFAULT-001` | Default screen offers pasted invitation URL and in-page QR scanning. | Phase 1 blocker |
| `TABLET-FULLSCREEN-001` | Tablet secondary controls include a full-screen option with honest unsupported/error feedback. | Phase 1 blocker plus physical gate |
| `PLAYER-LIVE-SYNC-001` | New streets and hands arrive without manual page refresh; a visible Refresh now/Reconnect action remains. | Phase 1 blocker |
| `COMPACT-CARD-OVERFLOW-001` | Phone/host mini cards never overlap or escape their container. | Phase 1 blocker |
| `COMPACT-CARD-STYLE-002` | Mini cards are a simple one-sided representation without mirrored lower corner or large centre pip. | Phase 1 blocker |
| `SHOWDOWN-BEST-FIVE-001` | Winning shown hand identifies its best five; used cards are emphasized and unused shown cards recede. | Phase 1 blocker |
| `SIT-OUT-RECOVERY-001` | A sitting-out player can return for the next hand or permanently leave/revoke this seat credential. | Phase 1 blocker |
| `TABLET-SLIDER-CONFORMANCE-001` | The shipped slider exactly follows the approved short physical-switch geometry and contains no native-range rendering artifacts. | Phase 1 blocker |
| `TABLET-SECONDARY-MENU-CONFORMANCE-001` | The second level is a centered, substantial, coherent control surface matching the approved information architecture. | Phase 1 blocker |
| `TABLET-PLAYER-MANAGEMENT-001` | From the host's Tablet View, Players & seats opens the real administration surface; every secondary control is exercised end to end rather than checked for presence only. | Phase 1 blocker |
| `QA-PHYSICAL-DESIGN-GATE-001` | Physical device QA is additional evidence and never an excuse for screenshot-visible defects. | Process blocker |
| `QA-INDEPENDENT-SYSTEM-001` | QA authority lives in repository documents and machine-readable checks, not model context. | Process blocker |
| `QA-TRACEABILITY-COMPLETE-001` | Every PRD function, decision ID, TUI detail, and feedback ID is imported into QA coverage. | Process blocker |
| `QA-VISUAL-BASELINE-001` | Approved visible states have deterministic baseline plus geometry and negative assertions. | Process blocker |
| `QA-NO-CONTEXT-DEPENDENCE-001` | A new contributor can run and interpret the gates without reading the originating chat. | Process blocker |
| `QA-RELEASE-BLOCK-001` | CI and publication stop when any release-blocking QA gate fails. | Process blocker |
| `QA-SECONDARY-ACTION-COVERAGE-001` | Every available secondary-menu action has a machine-enforced stable action ID, is invoked, and has its resulting state asserted; unavailable authority is explicit and non-interactive. | Process blocker |
| `QA-VISUAL-STATE-COVERAGE-001` | Interaction success cannot substitute for visual conformance. Upper-facing controls, the secondary menu, and the real Tablet player-administration surface require reviewed Darwin and Linux screenshot baselines. | Process blocker |
