# Phase 1 runtime architecture

**Status:** Local implementation reference. It describes the current code and automated evidence; the Phase 1 PRD remains normative. **Audience:** contributors and deployers. **Update when:** a trust boundary, transport, recovery artifact, or release format changes.

## Runtime shape

```mermaid
flowchart LR
  H["Trusted Host browser\nauthority + encrypted recovery"]
  P["Player browser\nseat credential + private projection"]
  D["TV / Public Table / Tablet\nrole-scoped public projection"]
  B["Local browser channel"]
  W["Direct WebRTC\nNormal or Airplane"]
  C["Connection Service\nsignaling + opaque relay + pairing mailbox"]
  S["IndexedDB\natomic local recovery"]

  H --> S
  P --> S
  H <-->|"same-browser development"| B
  H <-->|"preferred Normal path"| W
  H <-->|"sealed application messages"| C
  C <-->|"signaling / opaque frames"| P
  C <-->|"signaling / opaque frames"| D
  H <-->|"two-way QR; no service"| W
```

The diagram is a route map, not a claim that every route is available on every network. Game Core, Card Custody, identity/capabilities, persistence, diagnostics, and presentation remain separate packages; `apps/web` composes their browser adapters.

## Normal Mode

1. The host creates a binding containing the table ID, host key, build version, and protocol version.
2. When a deployer configures a Connection Service URL, the host sends its private operator token directly to `/v1/table-sessions` to receive a random, table-bound relay ticket. The static web configuration contains the URL only.
3. Invitation fragments carry the scoped relay ticket, table binding, one-use invitation token, and requested role. Fragments are not sent in ordinary HTTP requests, but they remain sensitive local data.
4. The client authenticates its invitation/credential inside sealed messages. The relay observes routing metadata and opaque frames; it does not interpret poker rules or receive card plaintext.
5. Direct WebRTC is attempted using relay signaling. If it does not open, the client uses the configured private relay, then optional cloud relay. A direct path uses an empty ICE-server list in the current implementation, so it is a local-network optimization rather than a universal NAT traversal guarantee.
6. An unpaired TV or Public Table creates an ephemeral pairing-request QR. The host scans it, chooses no extra authority, and places one encrypted answer in the Connection Service mailbox. The display can decrypt only that answer and only obtains the originally requested public role.

## Airplane Mode

Airplane Mode is a single generated HTML file. It embeds JavaScript, CSS, fonts, configuration, and third-party notices; its CSP denies `connect-src`. Host and client exchange a compressed two-way QR offer/answer that binds table/build/protocol/host identity and an expiring invitation. The resulting WebRTC channel uses `iceServers: []` and has no signaling, STUN, TURN, analytics, or network fetch path.

The code gives actionable failures for incompatible builds, stale/mismatched QR payloads, and a channel that cannot open. Whether a particular hotspot or browser supports peer-to-peer traffic is still a device/network test gate.

## Trust and secret boundaries

| Boundary | Fact in the implementation | Explicit limitation |
|---|---|---|
| Trusted Host | Holds card custody, authoritative commands, and local recovery secret. | A malicious host can read or manipulate the deck. |
| Player | Holds one credential and receives only its seat projection. | Screen capture, browser extensions, and a compromised device remain out of scope. |
| Public roles | Receive public board/shown information and cannot invoke player/card paths. | Physical display privacy is the table's responsibility. |
| Connection Service | Binds relay registrations to table/host/protocol and rejects cross-table/spoofed frames. It stores only a one-shot encrypted display-pairing envelope in memory. | It can observe IP/timing/size/routing metadata; service restart loses in-memory tickets and pairing mail. |
| IndexedDB | Stores encrypted host/client recovery state with an exclusive lease. | Browser storage eviction, device compromise, and cross-device host migration are not solved. |
| Diagnostics | Accepts allowlisted redacted records and exports locally. | Automated canary tests are not a human penetration test. |

## Recovery behavior

- The host persists its authority/identity state before acknowledgements and recovers only after an exclusive same-browser lease plus deterministic replay validates.
- A player refreshes from an encrypted local credential. An authenticated projection request marks that seat connected again.
- A page that sends the best-effort `pagehide` signal becomes offline; once the current hand ends, it becomes sitting out for subsequent hands. Browsers can terminate a page before an asynchronous signal completes, so the host roster is an advisory presence signal, not a crash-proof heartbeat.
- A relay ticket lasts four hours by default. The host can renew it by re-entering the operator token; the broker extends the same table-bound ticket, allowing currently connected clients to receive its new expiry through their sealed capability response. Ticket expiry controls new relay registrations; the current in-memory broker does not sever an already-open WebSocket at the deadline. An offline client that misses the refresh may need a fresh replacement link after its saved ticket expires.

## Evidence classification

**Fact:** Current contract and Chromium journey tests exercise authority replay, invitation revocation, private/public projection isolation, disconnect-to-sit-out, relay table isolation, direct WebRTC, relay fallback, reverse display pairing, standalone Airplane boot, and two-way Airplane pairing.

**Inference:** The narrow module boundaries and encryption/sealing reduce accidental cross-role exposure compared with a single shared UI state object. This is an engineering judgment supported by tests, not a cryptographic guarantee against a hostile host.

**Unknown:** Physical device compatibility, long-running browser suspension, NAT/TURN behavior, web server/service restart recovery, and mainland-China operation require dated external test evidence before claiming support.
