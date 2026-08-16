# Normal Mode operations

**Status:** Local guide plus owner-authorized temporary field deployment; not an official hosted-service runbook. **Audience:** the owner or a deployer running the static site and Connection Service. **Update when:** relay protocol, ticket handling, configuration, or supported matrix changes.

## Current owner field deployment

The CI-gated Normal web artifact is published at:

**https://cai-ruihe.github.io/html-poker-app/normal/**

The current Connection Service runs in the `html-poker-normal-service` container on the owner's laptop. An outbound `html-poker-normal-tunnel` container supplies trusted HTTPS/WSS without opening a router or laptop port. Keep the laptop and OrbStack awake while playing.

The operator token is stored outside the repository at `$HOME/Library/Application Support/HTML Poker/normal-service/operator-token` with owner-only permissions. Paste it into the host's **Private relay host token** field; never send it to player devices or add it to GitHub.

This first field setup uses a Cloudflare Quick Tunnel. Cloudflare documents Quick Tunnels as testing/development infrastructure with no uptime guarantee, and its random hostname changes if the tunnel is recreated. If that happens, update the `NORMAL_CONNECTION_SERVICE_URL` GitHub repository variable, rerun the CI-gated Pages deployment, and verify the new live artifact before starting a table. Do not silently restart the tunnel and continue using a stale site configuration.

Operational checks:

```sh
docker inspect --format '{{.State.Health.Status}}' html-poker-normal-service
docker ps --filter name=html-poker-normal
```

## What Normal Mode needs

For same-browser development, leave the runtime configuration empty. For multi-device use, publish `dist/normal/` on your own HTTPS origin and run your own Connection Service. The static site is not the poker engine: the active host remains authoritative, and the service only helps peers find/relay sealed messages.

The current Connection Service is an in-memory Node process. It requires these environment variables:

| Variable                          |                 Required | Meaning                                                                                                                                      |
| --------------------------------- | -----------------------: | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `POKER_CONNECTION_ACCESS_TOKEN`   |                      Yes | Long-lived operator secret accepted only by the table-session endpoint. Keep it off the static site and out of source control.               |
| `POKER_CONNECTION_HOST`           |                       No | Bind address; defaults to `127.0.0.1`.                                                                                                       |
| `POKER_CONNECTION_PORT`           |                       No | TCP port; defaults to `8787`.                                                                                                                |
| `POKER_CONNECTION_ALLOWED_ORIGIN` | No for local development | CORS/Origin policy value. Set the exact HTTPS app origin in a deployment; the `*` default is only suitable for controlled local development. |

Run the built service after setting the variables:

```sh
pnpm --filter @html-poker/connection-service start
```

For a locked production container, first build the service and create its production-only pnpm deployment directory, then build with `services/connection-service/Dockerfile`. The image runs as the unprivileged `node` user, exposes only port 8787 inside its private container network, and includes a health check.

Terminate TLS at a deployer-controlled reverse proxy and configure the browser with `wss://` in production. Use ordinary ingress rate limiting and network restrictions around the service; those controls are deployment infrastructure, not code supplied by this repository.

The baseline Normal artifact permits secure `https:` and `wss:` connection endpoints so that a deployer can use its own service. `pnpm release:configure-normal` rejects non-WSS endpoints, writes the URL-only runtime configuration, and narrows the built page's `connect-src` policy to that exact HTTPS/WSS origin. A deployer-controlled HTTP header may narrow the policy further.

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
3. If the host is also playing, enter **My display name** and choose **Join my own table**. The same page gains **Host Controls** and **My Hand**; after dealing it also gains **Table View** for a shared iPad/tablet screen.
4. Share the one-use player QR/link for every other seat. Treat the full link as sensitive: its fragment is not sent to the server, but it can remain in browser history, screenshots, clipboard history, or extensions.
5. Let the host deal after at least two player seats have joined. Normal Mode prefers direct WebRTC after private signaling and falls back to the private relay when direct WebRTC is unavailable.
6. Pair a TV/Public Table by opening **Pair this display** on the display, choosing the requested public role, then scanning its QR from the host. The display obtains nothing until that host scan completes.
7. Use the off-table **Connection Service** card to renew a relay ticket before a long interruption or after a recovered host reports expiry. The operator token is not persisted. Ticket expiry stops a new relay registration; it does not forcibly close an already-open in-memory WebSocket.

Keep the combined host page in the foreground on iPhone and iPad. Do not depend on separate host and player tabs: iOS may suspend the background document and therefore its host networking tasks.

## Recover after a Connection Service restart

The service keeps table tickets and routes only in memory, so an invitation copied before a service restart becomes stale. On the host page:

1. Open **Host Controls**.
2. In **Connection Service**, paste the private relay host token and choose **Refresh relay ticket**.
3. Copy or show the newly generated player invitation. Players must use that new link; retrying the old QR cannot restore its dropped route.

If the host browser itself no longer recovers the table, create a new table. Never put the operator token in a player link.

## Facts, inferences, and limits

**Fact:** Chromium tests demonstrate direct WebRTC after signaling, relay fallback when `RTCPeerConnection` is unavailable, scoped relay-ticket rejection, reverse TV pairing, stale-link diagnosis after a service restart, and host recovery by refreshing the ticket and sharing the regenerated invitation.

**Fact:** Chromium and Mobile WebKit journeys demonstrate that one active host document can redeem an ordinary Player invitation, switch among Host Controls, My Hand, and Table View, keep private cards out of Table View, and recover the same host/player roles after reload.

**Fact:** The Connection Service deliberately keeps tickets, peer registrations, and display mailboxes in process memory. Restarting it drops them; it is not a durable session database.

**Inference:** A deployer-owned service with TLS, an exact origin policy, and ingress controls is a more reviewable boundary than a hard-coded shared public relay. It does not make the host trustworthy or erase network metadata.

**Unknown / release gate:** Already-connected clients surviving a service restart, NAT traversal beyond local candidates, TURN deployment, relay failure under load, physical iPhone/iPad backgrounding, and regional/China reachability have not been validated by the local automated suite. Do not advertise them as supported.
