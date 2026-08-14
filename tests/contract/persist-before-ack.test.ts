import { describe, expect, it } from "vitest";

import { createCardCustody } from "@html-poker/card-custody";
import { createTrustedHostAuthority } from "@html-poker/game-core";

describe("Trusted Host persistence boundary", () => {
  it("does not acknowledge or project a transition when atomic persistence fails", async () => {
    const authority = createTrustedHostAuthority({
      authorityEpoch: "epoch-1",
      custody: createCardCustody({ shuffler: (deck) => deck }),
      handIdFactory: () => "hand-1",
      store: {
        async commit() {
          return { reason: "unavailable", status: "failed" } as never;
        },
        async load() {
          return undefined;
        },
      },
      tableId: "table-1",
    });

    await expect(
      authority.submit({
        actor: { actorId: "host-1", kind: "trusted-host" },
        authorityEpoch: "epoch-1",
        commandId: "command-create",
        expectedRevision: 0,
        payload: {
          dealerSeatId: "seat-a",
          seats: [
            { displayName: "Alice", seatId: "seat-a" },
            { displayName: "Bob", seatId: "seat-b" },
          ],
          type: "CreateTable",
        },
        tableId: "table-1",
      }),
    ).resolves.toEqual({
      code: "persistence-failed",
      revision: 0,
      status: "rejected",
    });
    expect(() => authority.project({ kind: "public" })).toThrow(
      "The table has not been created.",
    );
  });
});
