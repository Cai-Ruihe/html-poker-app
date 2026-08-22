import { describe, expect, it } from "vitest";

import { createMemoryTableStore } from "@html-poker/persistence";

describe("in-memory atomic table store", () => {
  it("commits at one expected revision and returns isolated clones", async () => {
    const store = createMemoryTableStore<{ cards: string[] }>();
    expect(await store.load()).toBeUndefined();

    const original = { revision: 1, state: { cards: ["As"] } };
    await expect(store.commit(0, original)).resolves.toEqual({
      status: "committed",
    });
    original.state.cards[0] = "2c";

    const loaded = await store.load();
    expect(loaded).toEqual({ revision: 1, state: { cards: ["As"] } });
    if (!loaded) throw new Error("Expected a committed record.");
    loaded.state.cards[0] = "Kd";
    await expect(store.load()).resolves.toEqual({
      revision: 1,
      state: { cards: ["As"] },
    });
  });

  it("reports the actual revision on a compare-and-swap conflict", async () => {
    const store = createMemoryTableStore<{ value: number }>();
    await store.commit(0, { revision: 1, state: { value: 1 } });

    await expect(
      store.commit(0, { revision: 2, state: { value: 2 } }),
    ).resolves.toEqual({ actualRevision: 1, status: "revision-conflict" });
  });

  it("removes a dissolved table so it cannot be recovered", async () => {
    const store = createMemoryTableStore<{ value: number }>();
    await store.commit(0, { revision: 1, state: { value: 1 } });

    await expect(store.remove()).resolves.toBeUndefined();
    await expect(store.load()).resolves.toBeUndefined();
    await expect(
      store.commit(0, { revision: 1, state: { value: 2 } }),
    ).resolves.toEqual({ status: "committed" });
  });
});
