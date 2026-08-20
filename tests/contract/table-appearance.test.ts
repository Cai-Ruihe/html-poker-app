import { describe, expect, it } from "vitest";

import { createCardCustody } from "@html-poker/card-custody";
import {
  createTrustedHostAuthority,
  type CommandEnvelope,
  type PersistedAuthorityState,
} from "@html-poker/game-core";
import { createMemoryTableStore } from "@html-poker/persistence";

function command(
  commandId: string,
  expectedRevision: number,
  payload: CommandEnvelope["payload"],
  actor: CommandEnvelope["actor"] = {
    actorId: "host-1",
    kind: "trusted-host",
  },
): CommandEnvelope {
  return {
    actor,
    authorityEpoch: "epoch-1",
    commandId,
    expectedRevision,
    payload,
    tableId: "table-1",
  };
}

describe("synchronized table appearance", () => {
  it("defaults, authorizes, projects, and recovers the selected table appearance", async () => {
    const store = createMemoryTableStore<PersistedAuthorityState>();
    const first = createTrustedHostAuthority({
      authorityEpoch: "epoch-1",
      custody: createCardCustody({ shuffler: (deck) => deck }),
      handIdFactory: () => "hand-1",
      store,
      tableId: "table-1",
    });
    await first.submit(
      command("create", 0, {
        dealerSeatId: "seat-a",
        seats: [
          { displayName: "Alice", seatId: "seat-a" },
          { displayName: "Bob", seatId: "seat-b" },
        ],
        type: "CreateTable",
      }),
    );

    expect(first.project({ kind: "public" })).toMatchObject({
      cardStyle: "classic",
      tableTheme: "dark-green",
    });
    await expect(
      first.submit(
        command(
          "seat-theme",
          1,
          { tableTheme: "black-gold", type: "SetTableTheme" },
          { kind: "seat", seatId: "seat-a" },
        ),
      ),
    ).resolves.toMatchObject({
      code: "command-not-allowed",
      status: "rejected",
    });
    await expect(
      first.submit(
        command("host-theme", 1, {
          tableTheme: "black-gold",
          type: "SetTableTheme",
        }),
      ),
    ).resolves.toMatchObject({
      events: [{ type: "TableThemeChanged" }],
      revision: 2,
      status: "accepted",
    });
    expect(first.project({ kind: "public" }).tableTheme).toBe("black-gold");

    await expect(
      first.submit(
        command(
          "seat-card-style",
          2,
          { cardStyle: "four-colour", type: "SetCardStyle" },
          { kind: "seat", seatId: "seat-a" },
        ),
      ),
    ).resolves.toMatchObject({
      code: "command-not-allowed",
      status: "rejected",
    });
    await expect(
      first.submit(
        command("host-card-style", 2, {
          cardStyle: "four-colour",
          type: "SetCardStyle",
        }),
      ),
    ).resolves.toMatchObject({
      events: [{ type: "CardStyleChanged" }],
      revision: 3,
      status: "accepted",
    });
    expect(first.project({ kind: "public" }).cardStyle).toBe("four-colour");

    const recovered = createTrustedHostAuthority({
      authorityEpoch: "epoch-1",
      custody: createCardCustody({ shuffler: (deck) => deck }),
      handIdFactory: () => "hand-2",
      store,
      tableId: "table-1",
    });
    await expect(recovered.recover()).resolves.toEqual({
      revision: 3,
      status: "recovered",
    });
    expect(recovered.project({ kind: "public" }).tableTheme).toBe("black-gold");
    expect(recovered.project({ kind: "public" }).cardStyle).toBe("four-colour");
  });
});
