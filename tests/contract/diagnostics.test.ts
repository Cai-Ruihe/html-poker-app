import { describe, expect, it } from "vitest";

import {
  createDiagnosticLog,
  createHandIdGenerator,
} from "@html-poker/diagnostics";

describe("redacted diagnostics", () => {
  it("generates time-sortable UUIDv7 Hand IDs through clock rollback and same-millisecond calls", () => {
    let now = 1_700_000_000_000;
    let randomByte = 0;
    const generator = createHandIdGenerator({
      now: () => now,
      randomBytes: (length) =>
        Uint8Array.from({ length }, () => (randomByte++ % 251) + 1),
    });

    const first = generator.next();
    const second = generator.next();
    now -= 5_000;
    const afterRollback = generator.next();

    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(new Set([first, second, afterRollback]).size).toBe(3);
    expect([first, second, afterRollback]).toEqual(
      [...[first, second, afterRollback]].sort(),
    );
  });

  it("exports only the allowlisted schema and expires old unpinned records", async () => {
    let now = Date.UTC(2026, 0, 31);
    const log = createDiagnosticLog({
      maxEntries: 2,
      now: () => now,
      pseudonymSalt: "table-local-salt",
      retentionMs: 30 * 24 * 60 * 60 * 1_000,
    });
    const tablePseudonym = await log.pseudonymize("table-secret-value");
    const actorPseudonym = await log.pseudonymize("Alice");
    expect(
      log.record({
        actorPseudonym,
        buildVersion: "0.1.0",
        capabilityScope: "player",
        commandId: "command-1",
        durationMs: 12,
        eventType: "command",
        handId: "018bcfe5-6800-7000-8000-000000000001",
        protocolVersion: 1,
        result: "accepted",
        revision: 3,
        route: "direct",
        tablePseudonym,
      }),
    ).toEqual({ status: "accepted" });

    now += 31 * 24 * 60 * 60 * 1_000;
    log.record({
      actorPseudonym,
      buildVersion: "0.1.0",
      capabilityScope: "table-control",
      errorClass: "route-timeout",
      eventType: "route",
      protocolVersion: 1,
      result: "rejected",
      route: "private-relay",
      tablePseudonym,
    });

    const exported = JSON.parse(log.export()) as {
      entries: unknown[];
      privacyClass: string;
      schemaVersion: number;
    };
    expect(exported).toMatchObject({
      privacyClass: "redacted-diagnostics",
      schemaVersion: 1,
    });
    expect(exported.entries).toHaveLength(1);
    const serialized = JSON.stringify(exported);
    expect(serialized).not.toContain("Alice");
    expect(serialized).not.toContain("table-secret-value");
    expect(serialized).not.toMatch(/\b(?:[2-9TJQKA][cdhs])\b/);
  });

  it("drops malformed or oversized values instead of serializing arbitrary context", () => {
    const log = createDiagnosticLog({ pseudonymSalt: "salt" });
    expect(
      log.record({
        actorPseudonym: "actor-1",
        buildVersion: "x".repeat(200),
        capabilityScope: "player",
        eventType: "command",
        protocolVersion: 1,
        result: "error",
        route: "direct",
        tablePseudonym: "table-1",
      }),
    ).toEqual({ reason: "invalid-event", status: "dropped" });
    expect(JSON.parse(log.export())).toMatchObject({ entries: [] });
  });
});
