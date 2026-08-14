import { randomBytes, timingSafeEqual } from "node:crypto";

import type { OpaqueEnvelope } from "@html-poker/realtime-transport";

export interface RelayClient {
  readonly clientId: string;
  close(code: number, reason: string): void;
  send(frame: string): void;
}

export interface RelayRegistration {
  readonly accessToken: string;
  readonly hostKey: string;
  readonly peerId: string;
  readonly protocolVersion: number;
  readonly tableId: string;
}

export interface RelayMetadata {
  readonly byteLength: number;
  readonly recipientPeerId: string;
  readonly senderPeerId: string;
  readonly tableId: string;
  readonly timestamp: number;
}

export type BrokerResult =
  | { readonly status: "accepted" | "relayed" }
  | {
      readonly code:
        | "access-denied"
        | "binding-mismatch"
        | "client-unknown"
        | "invalid-frame"
        | "oversized-frame"
        | "peer-conflict"
        | "recipient-unavailable"
        | "session-expired";
      readonly status: "rejected";
    };

export interface RelaySessionRequest {
  readonly hostKey: string;
  readonly operatorToken: string;
  readonly protocolVersion: number;
  readonly tableId: string;
}

export interface RelaySessionTicket {
  readonly accessToken: string;
  readonly expiresAt: number;
}

export type RelaySessionResult =
  | { readonly status: "issued"; readonly ticket: RelaySessionTicket }
  | {
      readonly code: "access-denied" | "binding-mismatch";
      readonly status: "rejected";
    };

export interface ConnectionBroker {
  issueSession(request: RelaySessionRequest): RelaySessionResult;
  receive(clientId: string, frame: string): BrokerResult;
  register(client: RelayClient, registration: RelayRegistration): BrokerResult;
  unregister(clientId: string): void;
}

export interface ConnectionBrokerOptions {
  readonly accessToken: string;
  readonly maxFrameBytes?: number;
  readonly now?: () => number;
  readonly onMetadata?: (metadata: RelayMetadata) => void;
  readonly sessionTtlMs?: number;
}

/**
 * An opaque response to an unpaired Normal Mode display. The Connection
 * Service stores only this encrypted envelope; the display QR carries the
 * decryption secret and the host chooses the requested role by scanning it.
 */
export interface DisplayPairingEnvelope {
  readonly ciphertext: string;
  readonly expiresAt: number;
  readonly iv: string;
}

export type DisplayPairingPutResult =
  | { readonly status: "stored" }
  | {
      readonly code: "capacity" | "expired" | "invalid-envelope" | "invalid-request";
      readonly status: "rejected";
    };

export type DisplayPairingTakeResult =
  | { readonly status: "pending" }
  | { readonly envelope: DisplayPairingEnvelope; readonly status: "answered" };

export interface DisplayPairingMailbox {
  put(requestId: string, envelope: DisplayPairingEnvelope): DisplayPairingPutResult;
  take(requestId: string): DisplayPairingTakeResult;
}

export interface DisplayPairingMailboxOptions {
  readonly maxEntries?: number;
  readonly maxTtlMs?: number;
  readonly now?: () => number;
}

interface ActivePeer {
  readonly client: RelayClient;
  readonly registration: Omit<RelayRegistration, "accessToken">;
}

interface IssuedSession {
  expiresAt: number;
  readonly registration: Omit<RelayRegistration, "accessToken" | "peerId">;
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

function boundedString(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

function validDisplayPairingRequest(value: string): boolean {
  return value.length >= 16 && value.length <= 128;
}

function validDisplayPairingEnvelope(
  value: DisplayPairingEnvelope,
  now: number,
  maxTtlMs: number,
): boolean {
  return (
    boundedString(value.ciphertext, 65_536) &&
    boundedString(value.iv, 512) &&
    Number.isSafeInteger(value.expiresAt) &&
    value.expiresAt > now &&
    value.expiresAt <= now + maxTtlMs
  );
}

function validRegistration(registration: RelayRegistration): boolean {
  return (
    boundedString(registration.accessToken, 512) &&
    boundedString(registration.hostKey, 512) &&
    boundedString(registration.peerId, 128) &&
    boundedString(registration.tableId, 128) &&
    Number.isInteger(registration.protocolVersion) &&
    registration.protocolVersion >= 1
  );
}

function validEnvelope(envelope: OpaqueEnvelope): boolean {
  return (
    boundedString(envelope.ciphertext, 65_536) &&
    boundedString(envelope.hostKey, 512) &&
    boundedString(envelope.messageId, 128) &&
    boundedString(envelope.recipientPeerId, 128) &&
    boundedString(envelope.senderPeerId, 128) &&
    boundedString(envelope.tableId, 128) &&
    Number.isInteger(envelope.protocolVersion) &&
    envelope.protocolVersion >= 1 &&
    Number.isSafeInteger(envelope.sequence) &&
    envelope.sequence >= 0
  );
}

function peerKey(registration: {
  readonly hostKey: string;
  readonly peerId: string;
  readonly protocolVersion: number;
  readonly tableId: string;
}): string {
  return JSON.stringify([
    registration.tableId,
    registration.hostKey,
    registration.protocolVersion,
    registration.peerId,
  ]);
}

function sessionKey(registration: Omit<RelayRegistration, "accessToken" | "peerId">): string {
  return JSON.stringify([
    registration.tableId,
    registration.hostKey,
    registration.protocolVersion,
  ]);
}

export function createConnectionBroker(
  options: ConnectionBrokerOptions,
): ConnectionBroker {
  if (!boundedString(options.accessToken, 512)) {
    throw new Error("A non-empty operator access token is required.");
  }
  const maxFrameBytes = options.maxFrameBytes ?? 65_536;
  const now = options.now ?? Date.now;
  const sessionTtlMs = options.sessionTtlMs ?? 4 * 60 * 60 * 1_000;
  if (!Number.isSafeInteger(sessionTtlMs) || sessionTtlMs < 60_000) {
    throw new Error("Connection Service session TTL must be at least one minute.");
  }
  const peersByClient = new Map<string, ActivePeer>();
  const clientsByPeer = new Map<string, ActivePeer>();
  const sessionsByToken = new Map<string, IssuedSession>();
  const sessionTokensByBinding = new Map<string, string>();

  function sweepSessions(currentTime: number): void {
    for (const [token, session] of sessionsByToken) {
      if (session.expiresAt <= currentTime) {
        sessionsByToken.delete(token);
        const key = sessionKey(session.registration);
        if (sessionTokensByBinding.get(key) === token) {
          sessionTokensByBinding.delete(key);
        }
      }
    }
  }

  return {
    issueSession(request) {
      if (!safeEqual(request.operatorToken, options.accessToken)) {
        return { code: "access-denied", status: "rejected" };
      }
      if (
        !boundedString(request.hostKey, 512) ||
        !boundedString(request.tableId, 128) ||
        !Number.isInteger(request.protocolVersion) ||
        request.protocolVersion < 1
      ) {
        return { code: "binding-mismatch", status: "rejected" };
      }
      const currentTime = now();
      sweepSessions(currentTime);
      const registration = {
        hostKey: request.hostKey,
        protocolVersion: request.protocolVersion,
        tableId: request.tableId,
      };
      const key = sessionKey(registration);
      const previousToken = sessionTokensByBinding.get(key);
      const previous = previousToken
        ? sessionsByToken.get(previousToken)
        : undefined;
      const expiresAt = currentTime + sessionTtlMs;
      if (previousToken && previous) {
        previous.expiresAt = expiresAt;
        return {
          status: "issued",
          ticket: { accessToken: previousToken, expiresAt },
        };
      }
      const accessToken = randomBytes(32).toString("base64url");
      sessionsByToken.set(accessToken, {
        expiresAt,
        registration,
      });
      sessionTokensByBinding.set(key, accessToken);
      return { status: "issued", ticket: { accessToken, expiresAt } };
    },
    receive(clientId, frame) {
      if (Buffer.byteLength(frame, "utf8") > maxFrameBytes) {
        return { code: "oversized-frame", status: "rejected" };
      }
      const sender = peersByClient.get(clientId);
      if (!sender) return { code: "client-unknown", status: "rejected" };
      let parsed: unknown;
      try {
        parsed = JSON.parse(frame);
      } catch {
        return { code: "invalid-frame", status: "rejected" };
      }
      if (!parsed || typeof parsed !== "object") {
        return { code: "invalid-frame", status: "rejected" };
      }
      const candidate = parsed as {
        readonly envelope?: OpaqueEnvelope;
        readonly type?: string;
      };
      if (
        candidate.type !== "envelope" ||
        !candidate.envelope ||
        !validEnvelope(candidate.envelope)
      ) {
        return { code: "invalid-frame", status: "rejected" };
      }
      const envelope = candidate.envelope;
      const senderRegistration = sender.registration;
      if (
        envelope.senderPeerId !== senderRegistration.peerId ||
        envelope.tableId !== senderRegistration.tableId ||
        envelope.hostKey !== senderRegistration.hostKey ||
        envelope.protocolVersion !== senderRegistration.protocolVersion
      ) {
        return { code: "binding-mismatch", status: "rejected" };
      }
      const recipient = clientsByPeer.get(
        peerKey({
          hostKey: envelope.hostKey,
          peerId: envelope.recipientPeerId,
          protocolVersion: envelope.protocolVersion,
          tableId: envelope.tableId,
        }),
      );
      if (!recipient) {
        return { code: "recipient-unavailable", status: "rejected" };
      }
      recipient.client.send(frame);
      try {
        options.onMetadata?.({
          byteLength: Buffer.byteLength(frame, "utf8"),
          recipientPeerId: envelope.recipientPeerId,
          senderPeerId: envelope.senderPeerId,
          tableId: envelope.tableId,
          timestamp: now(),
        });
      } catch {
        // Diagnostics failure never blocks the opaque relay.
      }
      return { status: "relayed" };
    },
    register(client, registration) {
      if (!validRegistration(registration)) {
        return { code: "binding-mismatch", status: "rejected" };
      }
      const currentTime = now();
      const session = sessionsByToken.get(registration.accessToken);
      sweepSessions(currentTime);
      if (!session) {
        return { code: "access-denied", status: "rejected" };
      }
      if (session.expiresAt <= currentTime) {
        sessionsByToken.delete(registration.accessToken);
        return { code: "session-expired", status: "rejected" };
      }
      if (
        session.registration.tableId !== registration.tableId ||
        session.registration.hostKey !== registration.hostKey ||
        session.registration.protocolVersion !== registration.protocolVersion
      ) {
        return { code: "binding-mismatch", status: "rejected" };
      }
      const key = peerKey(registration);
      if (peersByClient.has(client.clientId) || clientsByPeer.has(key)) {
        return { code: "peer-conflict", status: "rejected" };
      }
      const active: ActivePeer = {
        client,
        registration: {
          hostKey: registration.hostKey,
          peerId: registration.peerId,
          protocolVersion: registration.protocolVersion,
          tableId: registration.tableId,
        },
      };
      peersByClient.set(client.clientId, active);
      clientsByPeer.set(key, active);
      return { status: "accepted" };
    },
    unregister(clientId) {
      const active = peersByClient.get(clientId);
      if (!active) return;
      peersByClient.delete(clientId);
      clientsByPeer.delete(peerKey(active.registration));
    },
  };
}

export function createDisplayPairingMailbox(
  options: DisplayPairingMailboxOptions = {},
): DisplayPairingMailbox {
  const entries = new Map<string, DisplayPairingEnvelope>();
  const now = options.now ?? Date.now;
  const maxEntries = options.maxEntries ?? 1_024;
  const maxTtlMs = options.maxTtlMs ?? 15 * 60 * 1_000;

  function sweep(currentTime: number): void {
    for (const [requestId, envelope] of entries) {
      if (envelope.expiresAt <= currentTime) entries.delete(requestId);
    }
  }

  return {
    put(requestId, envelope) {
      const currentTime = now();
      sweep(currentTime);
      if (!validDisplayPairingRequest(requestId)) {
        return { code: "invalid-request", status: "rejected" };
      }
      if (!validDisplayPairingEnvelope(envelope, currentTime, maxTtlMs)) {
        return {
          code: envelope.expiresAt <= currentTime ? "expired" : "invalid-envelope",
          status: "rejected",
        };
      }
      if (!entries.has(requestId) && entries.size >= maxEntries) {
        return { code: "capacity", status: "rejected" };
      }
      entries.set(requestId, { ...envelope });
      return { status: "stored" };
    },
    take(requestId) {
      const currentTime = now();
      sweep(currentTime);
      if (!validDisplayPairingRequest(requestId)) return { status: "pending" };
      const envelope = entries.get(requestId);
      if (!envelope) return { status: "pending" };
      entries.delete(requestId);
      return { envelope: { ...envelope }, status: "answered" };
    },
  };
}
