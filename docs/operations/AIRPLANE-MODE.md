# Airplane Mode operations

**Status:** Local operator guide. **Audience:** a group preparing an offline physical table. **Update when:** artifact format, pairing protocol, or device support matrix changes.

## Before travel

1. Build from the reviewed commit with `pnpm build`.
2. Copy the exact `dist/airplane/poker-airplane.html` file to every participating device before losing internet access.
3. Keep the files on the same build/protocol version. The pairing QR rejects incompatible versions before private delivery.
4. Test the file by opening it directly from the device's file system. A development server is not an Airplane test.
5. Create or verify a private Wi-Fi network that allows devices to talk directly to each other. Captive portals and client-isolating hotspots can block the WebRTC channel.

## Pairing flow

1. On the host file, create a table.
2. Select **Pair Player** (or a public role) to show an offer QR.
3. On the other device, open the same downloaded file, choose **Join an Airplane table**, and scan the host offer.
4. The other device shows an answer QR. Scan that answer at the host.
5. After the host confirms the direct channel, the player chooses a display name and joins. Repeat for each player or display.

The pairing exchange is intentionally two-way. It avoids a server, typed pairing code, file transfer, Bluetooth requirement, STUN, TURN, analytics, remote font fetch, and service-worker update path.

## What the artifact guarantees locally

**Fact:** The build script inlines the application JavaScript, stylesheet, Archivo font assets, Airplane configuration, and third-party notice bundle. Its Airplane CSP uses `connect-src 'none'`, and the browser journey opens the generated `file://` artifact while observing no requests beyond the file itself.

**Fact:** The Airplane adapter creates `RTCPeerConnection({ iceServers: [] })`; it binds QR offers/answers to table, host key, build/protocol, role, expiry, and one-use invitation data. Chromium exercises the two-player direct pairing journey from the generated file.

**Unknown:** The automated two-player path does not prove that every iPhone, iPad, Android device, TV browser, file manager, camera picker, or private hotspot will permit the same flow. In the current headless Mobile WebKit probe, a `file://` peer stayed in ICE gathering with no local candidate after eight seconds, so that project runs the artifact boot smoke but not a false passing direct-pairing test. Physical device evidence remains required.

## Failure handling

- **QR unreadable:** use the original QR at full brightness and avoid re-compressing screenshots. The bundled ZXing fallback is used where `BarcodeDetector` is unavailable.
- **Wrong or old file:** update every device to the same generated artifact and create a fresh offer.
- **Channel does not open:** treat client isolation or unsupported local WebRTC as the likely cause; use a different private Wi-Fi network or return to Normal Mode when connectivity is available.
- **Host loss:** Phase 1 permits permanent host loss to end the game. Same-browser local recovery is the only supported authority recovery path; do not copy active custody state between devices.

Record actual device/browser/network results before claiming Airplane support publicly. The Phase 1 PRD requires WAN-removed, two-to-ten-seat, public-display, isolation, refresh, mixed-version, and zero-external-request evidence on the intended matrix.
