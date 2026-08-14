# Normal Mode operations

**Status:** Local deployment guide, not an official hosted-service runbook. **Audience:** a deployer running their own static site and Connection Service. **Update when:** relay protocol, ticket handling, configuration, or supported matrix changes.

## What Normal Mode needs

For same-browser development, leave the runtime configuration empty. For multi-device use, publish `dist/normal/` on your own HTTPS origin and run your own Connection Service. The static site is not the poker engine: the active host remains authoritative, and the service only helps peers find/relay sealed messages.

The current Connection Service is an in-memory Node process. It requires these environment variables:

| Variable | Required | Meaning |
|---|---:|---|
| `POKER_CONNECTION_ACCESS_TOKEN` | Yes | Long-lived operator secret accepted only by the table-session endpoint. Keep it off the static site and out of source control. |
| `POKER_CONNECTION_HOST` | No | Bind address; defaults to `127.0.0.1`. |
| `POKER_CONNECTION_PORT` | No | TCP port; defaults to `8787`. |
| `POKER_CONNECTION_ALLOWED_ORIGIN` | No for local development | CORS/Origin policy value. Set the exact HTTPS app origin in a deployment; the `*` default is only suitable for controlled local development. |

Run the built service after setting the variables:

```sh
pnpm --filter @html-poker/connection-service start
```

Terminate TLS at a deployer-controlled reverse proxy and configure the browser with `wss://` in production. Use ordinary ingress rate limiting and network restrictions around the service; those controls are deployment infrastructure, not code supplied by this repository.

The static Normal artifact permits secure `https:` and `wss:` connection endpoints so that a deployer can use its own service. At deployment, send a stricter HTTP Content-Security-Policy header with the exact service origin in `connect-src`; a header policy can narrow the artifact's baseline policy. Do not rely on a broad static policy as the final production boundary.

## Static configuration

The static build ships `poker-config.js`. Set an endpoint URL only:

```js
globalThis.__HTML_POKER_CONFIG__ = {
  privateRelay: { url: "wss://poker-relay.example.invalid" },
};
```

Do not put an operator token, table ticket, invitation secret, or personal endpoint credential in this file. The host asks for the operator token locally when creating/renewing a relay table. The service mints a random ticket bound to one table/host/protocol; player links contain that scoped ticket in their fragment, never the operator token.

## Table flow

1. Open the static site in the host browser and pass the capability preflight.
2. If a relay URL is configured, enter the private operator token locally and create the table. The UI refuses to create a configured relay table without it.
3. Share the one-use player QR/link. Treat the full link as sensitive: its fragment is not sent to the server, but it can remain in browser history, screenshots, clipboard history, or extensions.
4. Let the host deal after at least two players have joined. Normal Mode prefers direct WebRTC after private signaling and falls back to the private relay when direct WebRTC is unavailable.
5. Pair a TV/Public Table by opening **Pair this display** on the display, choosing the requested public role, then scanning its QR from the host. The display obtains nothing until that host scan completes.
6. Use the off-table **Connection Service** card to renew a relay ticket before a long interruption or after a recovered host reports expiry. The operator token is not persisted. Ticket expiry stops a new relay registration; it does not forcibly close an already-open in-memory WebSocket.

## Facts, inferences, and limits

**Fact:** Chromium tests demonstrate direct WebRTC after signaling, relay fallback when `RTCPeerConnection` is unavailable, scoped relay-ticket rejection, and reverse TV pairing.

**Fact:** The Connection Service deliberately keeps tickets, peer registrations, and display mailboxes in process memory. Restarting it drops them; it is not a durable session database.

**Inference:** A deployer-owned service with TLS, an exact origin policy, and ingress controls is a more reviewable boundary than a hard-coded shared public relay. It does not make the host trustworthy or erase network metadata.

**Unknown / release gate:** NAT traversal beyond local candidates, TURN deployment, relay failure under load, service restart recovery, browser backgrounding, and regional/China reachability have not been validated by the local automated suite. Do not advertise them as supported.
