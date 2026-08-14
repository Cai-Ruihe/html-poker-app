export type TransportRoute = "direct" | "private-relay" | "cloud-relay";

export interface TransportSession {
  readonly hostKey: string;
  readonly localPeerId: string;
  readonly protocolVersion: number;
  readonly remotePeerId: string;
  readonly tableId: string;
}

export interface OpaqueEnvelope {
  readonly ciphertext: string;
  readonly hostKey: string;
  readonly messageId: string;
  readonly protocolVersion: number;
  readonly recipientPeerId: string;
  readonly senderPeerId: string;
  readonly sequence: number;
  readonly tableId: string;
}

export interface TransportChannel {
  readonly route: TransportRoute;
  close(): void;
  send(envelope: OpaqueEnvelope): Promise<void>;
  subscribe(listener: (envelope: OpaqueEnvelope) => void): () => void;
}

export interface TransportAdapter {
  readonly route: TransportRoute;
  connect(session: TransportSession): Promise<TransportChannel>;
}

export interface RouteFailure {
  readonly code: "connect-failed";
  readonly route: TransportRoute;
}

export type SendResult =
  | { readonly status: "sent" }
  | {
      readonly code:
        | "binding-mismatch"
        | "invalid-envelope"
        | "oversized-envelope"
        | "send-failed";
      readonly status: "rejected";
    };

export interface ConnectedTransport {
  readonly attemptedRoutes: readonly TransportRoute[];
  readonly channel: TransportChannel;
  readonly route: TransportRoute;
  readonly status: "connected";
  close(): void;
  send(envelope: OpaqueEnvelope): Promise<SendResult>;
  subscribe(listener: (envelope: OpaqueEnvelope) => void): () => void;
}

export interface DisconnectedTransport {
  readonly attemptedRoutes: readonly TransportRoute[];
  readonly failures: readonly RouteFailure[];
  readonly status: "disconnected";
}

export type ConnectionResult = ConnectedTransport | DisconnectedTransport;

export interface ConnectivityStrategy {
  connect(session: TransportSession): Promise<ConnectionResult>;
}

export interface ConnectivityStrategyOptions {
  readonly adapters: readonly TransportAdapter[];
  readonly timeoutMs: number;
}

const routeOrder: readonly TransportRoute[] = [
  "direct",
  "private-relay",
  "cloud-relay",
];

function hasValidText(value: unknown, maximum: number): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.length <= maximum
  );
}

function envelopeFailure(
  envelope: OpaqueEnvelope,
  session: TransportSession,
): SendResult | undefined {
  if (envelope.ciphertext.length > 65_536) {
    return { code: "oversized-envelope", status: "rejected" };
  }
  if (
    envelope.tableId !== session.tableId ||
    envelope.hostKey !== session.hostKey ||
    envelope.protocolVersion !== session.protocolVersion ||
    envelope.senderPeerId !== session.localPeerId ||
    envelope.recipientPeerId !== session.remotePeerId
  ) {
    return { code: "binding-mismatch", status: "rejected" };
  }
  if (
    !hasValidText(envelope.ciphertext, 65_536) ||
    !hasValidText(envelope.messageId, 128) ||
    !Number.isSafeInteger(envelope.sequence) ||
    envelope.sequence < 0
  ) {
    return { code: "invalid-envelope", status: "rejected" };
  }
  return undefined;
}

function incomingEnvelopeIsValid(
  envelope: OpaqueEnvelope,
  session: TransportSession,
): boolean {
  const reversed: TransportSession = {
    ...session,
    localPeerId: session.remotePeerId,
    remotePeerId: session.localPeerId,
  };
  return envelopeFailure(envelope, reversed) === undefined;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = globalThis.setTimeout(
      () => reject(new Error("Transport connection timed out.")),
      timeoutMs,
    );
    promise.then(
      (value) => {
        globalThis.clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        globalThis.clearTimeout(timeout);
        reject(
          error instanceof Error ? error : new Error("Connection failed."),
        );
      },
    );
  });
}

export function createConnectivityStrategy(
  options: ConnectivityStrategyOptions,
): ConnectivityStrategy {
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new Error("The route timeout must be a positive finite duration.");
  }
  const adapterByRoute = new Map<TransportRoute, TransportAdapter>();
  for (const adapter of options.adapters) {
    if (!adapterByRoute.has(adapter.route)) {
      adapterByRoute.set(adapter.route, adapter);
    }
  }

  return {
    async connect(session) {
      const attemptedRoutes: TransportRoute[] = [];
      const failures: RouteFailure[] = [];
      for (const route of routeOrder) {
        const adapter = adapterByRoute.get(route);
        if (!adapter) continue;
        attemptedRoutes.push(route);
        try {
          const channel = await withTimeout(
            adapter.connect(structuredClone(session)),
            options.timeoutMs,
          );
          if (channel.route !== route) throw new Error("Route confusion.");
          const connected: ConnectedTransport = {
            attemptedRoutes: [...attemptedRoutes],
            channel,
            close() {
              channel.close();
            },
            route,
            async send(envelope) {
              const failure = envelopeFailure(envelope, session);
              if (failure) return failure;
              try {
                await channel.send(structuredClone(envelope));
                return { status: "sent" };
              } catch {
                return { code: "send-failed", status: "rejected" };
              }
            },
            status: "connected",
            subscribe(listener) {
              return channel.subscribe((envelope) => {
                if (!incomingEnvelopeIsValid(envelope, session)) return;
                listener(structuredClone(envelope));
              });
            },
          };
          return connected;
        } catch {
          failures.push({ code: "connect-failed", route });
        }
      }
      return {
        attemptedRoutes,
        failures,
        status: "disconnected",
      };
    },
  };
}

export interface BroadcastChannelAdapterOptions {
  readonly channelPrefix?: string;
}

export function createBroadcastChannelAdapter(
  options: BroadcastChannelAdapterOptions = {},
): TransportAdapter {
  const channelPrefix = options.channelPrefix ?? "html-poker";
  return {
    async connect(session) {
      const broadcast = new BroadcastChannel(
        `${channelPrefix}:${session.tableId}:${session.hostKey}`,
      );
      const listeners = new Set<(envelope: OpaqueEnvelope) => void>();
      broadcast.addEventListener("message", (event: MessageEvent<unknown>) => {
        if (!event.data || typeof event.data !== "object") return;
        const envelope = event.data as OpaqueEnvelope;
        if (envelope.recipientPeerId !== session.localPeerId) return;
        for (const listener of listeners) listener(envelope);
      });
      return {
        close() {
          listeners.clear();
          broadcast.close();
        },
        route: "direct",
        async send(envelope) {
          broadcast.postMessage(envelope);
        },
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      };
    },
    route: "direct",
  };
}

export interface WebSocketRelayAdapterOptions {
  readonly accessToken?: string;
  readonly route: "private-relay" | "cloud-relay";
  readonly url: string;
}

export function createWebSocketRelayAdapter(
  options: WebSocketRelayAdapterOptions,
): TransportAdapter {
  return {
    async connect(session) {
      const socket = new WebSocket(options.url);
      await new Promise<void>((resolve, reject) => {
        socket.addEventListener("open", () => resolve(), { once: true });
        socket.addEventListener(
          "error",
          () => reject(new Error("Relay connection failed.")),
          { once: true },
        );
      });
      socket.send(
        JSON.stringify({
          ...(options.accessToken ? { accessToken: options.accessToken } : {}),
          hostKey: session.hostKey,
          peerId: session.localPeerId,
          protocolVersion: session.protocolVersion,
          tableId: session.tableId,
          type: "register",
        }),
      );
      const listeners = new Set<(envelope: OpaqueEnvelope) => void>();
      const onMessage = (event: MessageEvent<string>) => {
        try {
          const parsed = JSON.parse(event.data) as {
            readonly envelope?: OpaqueEnvelope;
            readonly type?: string;
          };
          if (parsed.type !== "envelope" || !parsed.envelope) return;
          for (const listener of listeners) listener(parsed.envelope);
        } catch {
          // A malformed relay message is ignored at the card-blind seam.
        }
      };
      socket.addEventListener("message", onMessage);
      return {
        close() {
          listeners.clear();
          socket.removeEventListener("message", onMessage);
          socket.close(1000, "table route closed");
        },
        route: options.route,
        async send(envelope) {
          if (socket.readyState !== WebSocket.OPEN)
            throw new Error("Relay is not open.");
          socket.send(JSON.stringify({ envelope, type: "envelope" }));
        },
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      };
    },
    route: options.route,
  };
}
