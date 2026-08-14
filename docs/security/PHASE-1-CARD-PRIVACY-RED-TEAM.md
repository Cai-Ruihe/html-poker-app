# Phase 1 Card Privacy automated red-team record

**Status:** Automated regression record; it does not satisfy the PRD's final independent red-team release gate. **Audience:** reviewers and maintainers. **Update when:** a privacy boundary, runtime dependency, transport route, or artifact format changes.

## Scope and evidence

| Attack surface | Automated evidence | Result |
|---|---|---|
| Cross-seat/public card leakage | Contract projection tests and browser journey assertions inspect host/public/other-seat DOM for another player's card canary. | No observed leakage in the exercised paths. |
| Hostile display name / DOM injection | Browser security journey joins a name containing an image event handler and asserts inert text/no extra image/no page error. | Rejected as executable DOM behavior. |
| Browser storage | Browser security journey asserts ordinary `localStorage` and `sessionStorage` are empty while recovery uses the scoped persistence layer. | No observed ordinary web-storage residue. |
| Credential replay / role escalation | Identity contracts cover one-use, expired, revoked, wrongly bound invitations; copied recovery tab denial; and public/TV/table-control non-escalation. | Rejected by tested policy. |
| Relay cross-table/spoofed data | Connection Service contracts bind peer registration and envelopes to table/host/protocol and test cross-table/spoof/oversized frames. | Rejected before relay. |
| Relay ticket abuse | Contract tests require the operator token to mint a table ticket, reject mismatched bindings/expiry, and renew only the same scoped binding. | Scoped ticket path passes. |
| Reverse display pairing | Chromium journey creates a TV request QR, proves no dealer controls on the display, and requires host scan before the display receives its role. | Role remains public-only in the exercised path. |
| Airplane packaging | Chromium journey opens `file://` output, asserts no external asset URL, and pairs two players over direct local WebRTC. | Local Chromium artifact path passes; physical-device support remains an external gate. |
| Diagnostics | Diagnostic contracts and secret-boundary tests exercise allowlisted redaction and export behavior. | No tested raw-card/credential diagnostics path. |

## Findings classification

**Demonstrated fact:** The tests above are executable, repeatable local evidence. They show that the named regression paths behaved as expected under the test browsers and fixtures.

**Plausible residual risk:** Invitation fragments and table-scoped relay tickets are sensitive local capability material. A person with browser-history, clipboard, screen-capture, or extension access may copy them; encryption does not protect a compromised endpoint. The active Trusted Host can inspect private card state by design.

**Unknown:** No human adversarial review has assessed the generated bundles, browser extensions, developer tools, XSS chain, reverse proxy/TLS configuration, real TURN topology, physical-device storage behavior, denial of service, or service compromise on the intended deployment. No claim of penetration-test completion is made.

## Release-blocking follow-up

Before an official Phase 1 release, run the four PRD M08 packs—card/release, identity/transport, authority/recovery, Airplane/presentation—against a frozen candidate. Record each finding as fixed, explicitly accepted by the owner, or a release block. Do not place raw cards, tokens, QR images, or live diagnostics in that record.
