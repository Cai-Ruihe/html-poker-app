import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const appOrigin = `http://127.0.0.1:${process.env.HTML_POKER_TEST_PORT ?? "4173"}`;

async function joinPlayer(
  host: Page,
  context: BrowserContext,
  displayName: string,
): Promise<Page> {
  const invitationUrl = await host
    .getByLabel("Player invitation link")
    .inputValue();
  const player = await context.newPage();
  await player.goto(invitationUrl);
  await player.getByLabel("Display name").fill(displayName);
  await player.getByRole("button", { name: "Join table" }).click();
  await expect(
    player.getByRole("heading", { name: "You have a seat" }),
  ).toBeVisible();
  await expect(host.getByText(displayName, { exact: true })).toBeVisible();
  return player;
}

async function createTableWithTwoPlayers(
  host: Page,
  context: BrowserContext,
): Promise<{ readonly alice: Page; readonly bob: Page }> {
  await host.goto("/");
  await host.getByRole("button", { name: "Create table" }).click();
  await expect(
    host.getByRole("heading", { name: "Waiting for players" }),
  ).toBeVisible();
  const alice = await joinPlayer(host, context, "Alice");
  const bob = await joinPlayer(host, context, "Bob");
  await host.getByRole("button", { name: "Deal first hand" }).click();
  await expect(
    host.getByText("Pre-flop", { exact: true }).first(),
  ).toBeVisible();
  await expect(alice.getByRole("region", { name: "Your cards" })).toBeVisible();
  await expect(bob.getByRole("region", { name: "Your cards" })).toBeVisible();
  return { alice, bob };
}

test("the host device can play and switch to a private hand or public table view", async ({
  context,
  page: host,
}) => {
  await host.goto("/");
  await host.getByRole("button", { name: "Create table" }).click();
  await expect(
    host.getByRole("heading", { name: "Other devices join here" }),
  ).toBeVisible();
  await expect(
    host.getByText(
      "Do not scan or open this invitation on the Trusted Host device.",
    ),
  ).toBeVisible();
  await host.getByLabel("My display name").fill("Ruihe");
  await host
    .getByRole("button", { name: "Join my own table on this device" })
    .click();

  await expect(
    host.getByRole("heading", { name: "You have a seat" }),
  ).toBeVisible();
  await expect(
    host.getByRole("heading", { name: "Join this table" }),
  ).toHaveCount(0);
  await expect(host.locator("[data-private-card]")).toHaveCount(0);
  await host.getByRole("button", { name: "Host Controls" }).click();
  await expect(
    host.getByRole("heading", { name: "Waiting for players" }),
  ).toBeVisible();
  await expect(host.getByText("Ruihe", { exact: true })).toBeVisible();

  const bob = await joinPlayer(host, context, "Bob");
  await host.getByRole("button", { name: "Deal first hand" }).click();
  await expect(bob.locator("[data-private-card]")).toHaveCount(2);

  await host.getByRole("button", { name: "My Hand" }).click();
  await expect(host.getByRole("region", { name: "Your cards" })).toBeVisible();
  await expect(host.locator("[data-private-card]")).toHaveCount(2);
  const cardsBeforeRefresh = await host
    .locator("[data-private-card]")
    .evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-card")),
    );

  await host.evaluate(() => globalThis.dispatchEvent(new Event("pagehide")));
  await host.evaluate(() => globalThis.dispatchEvent(new Event("pageshow")));
  await expect(host.getByRole("region", { name: "Your cards" })).toBeVisible();
  await expect(host.getByText(/My Hand did not reconnect/u)).toHaveCount(0);

  await host.getByRole("button", { name: "Table View" }).click();
  await expect(host.getByLabel("Dealer controls")).toHaveCount(0);
  await expect(host.locator("[data-table-corner]")).toHaveCount(4);
  await expect(host.locator("[data-private-card]")).toHaveCount(0);

  await host.reload();
  await expect(host.getByRole("button", { name: "My Hand" })).toBeVisible();
  expect(new URL(host.url()).hash).toContain("resume=host");
  await host.getByRole("button", { name: "My Hand" }).click();
  await expect(host.locator("[data-private-card]")).toHaveCount(2);
  await expect
    .poll(() =>
      host
        .locator("[data-private-card]")
        .evaluateAll((cards) =>
          cards.map((card) => card.getAttribute("data-card")),
        ),
    )
    .toEqual(cardsBeforeRefresh);
  const combinedHostAccessibility = await new AxeBuilder({
    page: host,
  }).analyze();
  expect(combinedHostAccessibility.violations).toEqual([]);
});

test("host and two player devices complete a private deal-only hand without external requests", async ({
  context,
  page: host,
}) => {
  const unexpectedRequests: string[] = [];
  context.on("page", (page) => {
    page.on("request", (request) => {
      const requestUrl = new URL(request.url());
      if (requestUrl.origin !== appOrigin) {
        unexpectedRequests.push(request.url());
      }
    });
  });
  host.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.origin !== appOrigin) {
      unexpectedRequests.push(request.url());
    }
  });

  const { alice, bob } = await createTableWithTwoPlayers(host, context);
  const bundledLicences = await host.evaluate(async () =>
    fetch("./THIRD-PARTY-LICENSES.txt").then((response) => response.text()),
  );
  expect(bundledLicences).toContain("MIT License");

  await expect(host.locator("[data-private-card]")).toHaveCount(0);
  await expect(alice.locator("[data-private-card]")).toHaveCount(2);
  await expect(bob.locator("[data-private-card]")).toHaveCount(2);
  const aliceCard = await alice
    .locator("[data-private-card]")
    .first()
    .getAttribute("data-card");
  expect(aliceCard).toBeTruthy();
  await expect(bob.locator(`[data-card="${aliceCard}"]`)).toHaveCount(0);
  await expect(host.locator(`[data-card="${aliceCard}"]`)).toHaveCount(0);

  await host.getByRole("button", { name: "Deal the flop" }).click();
  await expect(host.locator("[data-board-card]")).toHaveCount(3);
  await expect(alice.locator("[data-board-card]")).toHaveCount(3);

  await alice.getByRole("button", { name: "Show cards to table" }).click();
  await expect(host.locator("[data-shown-card]")).toHaveCount(2);
  await expect(bob.getByRole("button", { name: "Muck" })).toHaveCount(0);
  await bob.getByRole("button", { name: "Fold", exact: true }).click();
  await expect(bob.getByRole("button", { name: "Undo fold" })).toBeVisible();

  await host.getByRole("button", { name: "Deal the turn" }).click();
  await expect(host.getByText("folded", { exact: true })).toBeVisible();
  await host.getByRole("button", { name: "Deal the river" }).click();
  await host.getByRole("button", { name: "End hand" }).click();
  await expect(host.getByText("Physical chips settled?")).toBeVisible();
  await host.getByRole("button", { name: "End this hand" }).click();
  await expect(
    host.getByText("Hand complete", { exact: true }).first(),
  ).toBeVisible();
  await host.getByRole("button", { name: "Deal next hand" }).click();
  await expect(
    host.getByText("Pre-flop", { exact: true }).first(),
  ).toBeVisible();
  await expect(host.locator("[data-board-card]")).toHaveCount(0);
  await expect(host.locator("[data-shown-card]")).toHaveCount(0);

  const hostAccessibility = await new AxeBuilder({ page: host }).analyze();
  const playerAccessibility = await new AxeBuilder({ page: alice }).analyze();
  expect(hostAccessibility.violations).toEqual([]);
  expect(playerAccessibility.violations).toEqual([]);
  expect(unexpectedRequests).toEqual([]);
});

test("two players complete a digital-chip hand only after host settlement confirmation", async ({
  context,
  page: host,
}) => {
  await host.goto("/?experimental=digital-chips");
  await host.getByLabel("Digital chips").check();
  await host.getByRole("button", { name: "Create table" }).click();
  await expect(
    host.getByRole("heading", { name: "Waiting for players" }),
  ).toBeVisible();

  const alice = await joinPlayer(host, context, "Alice");
  const bob = await joinPlayer(host, context, "Bob");
  await host.getByRole("button", { name: "Deal first hand" }).click();

  await expect(host.getByText("Pot 3", { exact: true })).toBeVisible();
  await host.getByRole("button", { name: /^Players/ }).click();
  await expect(host.getByText("New seats are paused")).toBeVisible();
  await expect(host.getByText(/does not admit late seats/u)).toBeVisible();
  await expect(
    host.getByRole("button", { name: "Open join window" }),
  ).toHaveCount(0);
  await host
    .getByRole("button", { name: "Close player administration" })
    .click();
  await alice.getByRole("button", { name: "Call 1" }).click();
  await bob.getByRole("button", { name: "Check" }).click();
  await expect(host.locator("[data-board-card]")).toHaveCount(3);
  await expect(host.getByText("Pot 4", { exact: true })).toBeVisible();

  await host.reload();
  await expect(host.locator("[data-board-card]")).toHaveCount(3);
  await expect(host.getByText("Pot 4", { exact: true })).toBeVisible();

  for (const player of [bob, alice, bob, alice, bob, alice]) {
    await player.getByRole("button", { name: "Check" }).click();
  }
  await expect(host.locator("[data-board-card]")).toHaveCount(5);
  await expect(
    host.getByText("Showdown", { exact: true }).first(),
  ).toBeVisible();

  await host.getByRole("button", { name: "Review settlement" }).click();
  await expect(
    host.getByText("Settlement review", { exact: true }).first(),
  ).toBeVisible();
  await expect(host.getByText("Total pot 4", { exact: true })).toBeVisible();
  await expect(
    host.getByText("Stacks update only after confirmation."),
  ).toBeVisible();

  const stacksBefore = await host
    .locator("[data-stack]")
    .evaluateAll((nodes) =>
      nodes.map((node) => Number(node.getAttribute("data-stack"))),
    );
  expect(stacksBefore).toEqual([98, 98]);

  await host.getByRole("button", { name: "Confirm settlement" }).click();
  await expect(
    host.getByText("Hand complete", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    host.getByText("This Phase 2 tracer ends after one hand."),
  ).toBeVisible();
  await expect(
    host.getByRole("button", { name: "Deal next hand" }),
  ).toHaveCount(0);
  const stacksAfter = await host
    .locator("[data-stack]")
    .evaluateAll((nodes) =>
      nodes.map((node) => Number(node.getAttribute("data-stack"))),
    );
  expect(stacksAfter.reduce((total, stack) => total + stack, 0)).toBe(200);
  expect(stacksAfter).not.toEqual(stacksBefore);
});

test("rapid repeated dealer input commits only one transition", async ({
  context,
  page: host,
}) => {
  const pageErrors: string[] = [];
  host.on("pageerror", (error) => pageErrors.push(error.message));
  await createTableWithTwoPlayers(host, context);

  await host.getByRole("button", { name: "Deal the flop" }).dblclick();

  await expect(host.getByText("Flop", { exact: true }).first()).toBeVisible();
  await expect(host.getByText("r3", { exact: true })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("overlapping table updates do not corrupt player recovery state", async ({
  context,
  page: host,
}) => {
  const { alice, bob } = await createTableWithTwoPlayers(host, context);

  await Promise.all([
    alice.getByRole("button", { name: "Show cards to table" }).click(),
    bob.getByRole("button", { name: "Fold", exact: true }).click(),
  ]);

  await expect(host.locator("[data-shown-card]")).toHaveCount(2);
  await expect(host.getByText(/folded/u).first()).toBeVisible();
  await alice.evaluate(() => globalThis.dispatchEvent(new Event("pagehide")));
  await host.getByRole("button", { name: /^Players/ }).click();
  await expect(
    host
      .locator(".roster li")
      .filter({ hasText: "Alice" })
      .getByText("playing · offline", { exact: true }),
  ).toBeVisible();
  await alice.waitForTimeout(500);
  await expect(alice.getByText(/Client recovery commit failed/u)).toHaveCount(
    0,
  );
  await expect(bob.getByText(/Client recovery commit failed/u)).toHaveCount(0);
});

test("host and player refresh recover the same active hand and private seat", async ({
  context,
  page: host,
}) => {
  const { alice } = await createTableWithTwoPlayers(host, context);
  const cardsBeforeRefresh = await alice
    .locator("[data-private-card]")
    .evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-card")),
    );

  await host.getByRole("button", { name: "Deal the flop" }).click();
  await expect(host.getByText("r3", { exact: true })).toBeVisible();
  await host.reload();
  await expect(host.getByText("Flop", { exact: true }).first()).toBeVisible();
  await expect(host.getByText("r3", { exact: true })).toBeVisible();

  await alice.reload();
  await expect(alice.getByRole("region", { name: "Your cards" })).toBeVisible();
  await expect(alice.locator("[data-private-card]")).toHaveCount(2);
  await expect
    .poll(() =>
      alice
        .locator("[data-private-card]")
        .evaluateAll((cards) =>
          cards.map((card) => card.getAttribute("data-card")),
        ),
    )
    .toEqual(cardsBeforeRefresh);

  await alice.getByRole("button", { name: "Show cards to table" }).click();
  await expect(host.locator("[data-shown-card]")).toHaveCount(2);
});

test("a copied recovery URL cannot open the same private seat in two tabs", async ({
  context,
  page: host,
}) => {
  const { alice } = await createTableWithTwoPlayers(host, context);
  const copiedRecoveryUrl = alice.url();
  const duplicate = await context.newPage();

  await duplicate.goto(copiedRecoveryUrl);
  await expect(
    duplicate.getByRole("heading", {
      name: "This saved table cannot be opened",
    }),
  ).toBeVisible();
  await expect(
    duplicate.getByText("This private seat is already open in another tab."),
  ).toBeVisible();
  await expect(alice.locator("[data-private-card]")).toHaveCount(2);
});

test("a disconnected player sits out after the current hand ends", async ({
  context,
  page: host,
}) => {
  const { alice } = await createTableWithTwoPlayers(host, context);
  await alice.evaluate(() => globalThis.dispatchEvent(new Event("pagehide")));
  await host.getByRole("button", { name: /^Players/ }).click();
  const aliceRosterItem = host
    .locator(".roster li")
    .filter({ hasText: "Alice" });
  await expect(
    aliceRosterItem.getByText("playing · offline", { exact: true }),
  ).toBeVisible();
  await host
    .getByRole("button", { name: "Close player administration" })
    .click();
  await host.getByRole("button", { name: "End hand" }).click();
  await host.getByRole("button", { name: "End this hand" }).click();
  await host.getByRole("button", { name: /^Players/ }).click();
  await expect(
    aliceRosterItem.getByText("sitting out · offline", { exact: true }),
  ).toBeVisible();
});

test("a temporarily hidden player page reconnects when it becomes visible", async ({
  context,
  page: host,
}) => {
  const { alice } = await createTableWithTwoPlayers(host, context);
  await alice.evaluate(() => globalThis.dispatchEvent(new Event("pagehide")));
  await host.getByRole("button", { name: /^Players/ }).click();
  const aliceRosterItem = host
    .locator(".roster li")
    .filter({ hasText: "Alice" });
  await expect(
    aliceRosterItem.getByText("playing · offline", { exact: true }),
  ).toBeVisible();

  await alice.evaluate(() => globalThis.dispatchEvent(new Event("pageshow")));

  await expect(
    aliceRosterItem.getByText("playing", { exact: true }),
  ).toBeVisible();
  await expect(alice.locator("[data-private-card]")).toHaveCount(2);
  await expect(alice.getByText(/recovery commit failed/u)).toHaveCount(0);
});

test("closing and reopening the Join Window invalidates the old invitation", async ({
  context,
  page: host,
}) => {
  await host.goto("/");
  await host.getByRole("button", { name: "Create table" }).click();
  const staleInvitation = await host
    .getByLabel("Player invitation link")
    .inputValue();

  await host.getByRole("button", { name: "Close join window" }).click();
  await expect(host.getByText("New seats are paused")).toBeVisible();
  const stalePlayer = await context.newPage();
  await stalePlayer.goto(staleInvitation);
  await stalePlayer.getByLabel("Display name").fill("Stale");
  await stalePlayer.getByRole("button", { name: "Join table" }).click();
  await expect(
    stalePlayer.getByRole("heading", { name: "This seat could not be opened" }),
  ).toBeVisible();
  await expect(stalePlayer.getByText("invitation-revoked")).toBeVisible();

  await host.getByRole("button", { name: "Open join window" }).first().click();
  const freshInvitation = await host
    .getByLabel("Player invitation link")
    .inputValue();
  expect(freshInvitation).not.toEqual(staleInvitation);
});

test("a one-use player replacement preserves the seat and revokes the old device", async ({
  context,
  page: host,
}) => {
  const { alice } = await createTableWithTwoPlayers(host, context);
  await host.getByRole("button", { name: /^Players/ }).click();
  const aliceRosterItem = host
    .locator(".roster li")
    .filter({ hasText: "Alice" });
  await aliceRosterItem.getByRole("button", { name: "Replace device" }).click();
  const replacementUrl = await host
    .getByLabel("Player replacement link")
    .inputValue();

  const replacement = await context.newPage();
  await replacement.goto(replacementUrl);
  await replacement
    .getByLabel("Display name")
    .fill("Ignored replacement label");
  await replacement.getByRole("button", { name: "Join table" }).click();
  await expect(
    replacement.getByRole("region", { name: "Your cards" }),
  ).toBeVisible();
  await expect(replacement.locator("[data-private-card]")).toHaveCount(2);

  await alice.getByRole("button", { name: "Show cards to table" }).click();
  await expect(
    alice.getByRole("heading", { name: "This seat could not be opened" }),
  ).toBeVisible();
  await expect(alice.getByText("credential-revoked")).toBeVisible();
  await replacement
    .getByRole("button", { name: "Show cards to table" })
    .click();
  await expect(host.locator("[data-shown-card]")).toHaveCount(2);
});

test("off-table administration moves seats, voids, corrects, and relocates the dealer", async ({
  context,
  page: host,
}) => {
  await createTableWithTwoPlayers(host, context);
  await host.getByRole("button", { name: /^Players/ }).click();

  await host.getByRole("button", { name: "Move Bob up" }).click();
  await expect(host.locator(".roster li strong").first()).toHaveText("Bob");

  await host.getByLabel("Reason to void the active hand").fill("Exposed card");
  await host.getByRole("button", { name: "Void active hand" }).click();
  await expect(
    host.getByText("Hand complete", { exact: true }).first(),
  ).toBeVisible();

  await host.getByLabel("Correction note").fill("Void confirmed by the table");
  await host.getByRole("button", { name: "Append correction" }).click();
  await expect(host.getByLabel("Event to annotate")).toContainText(
    "CorrectionRecorded",
  );

  const bobRosterItem = host.locator(".roster li").filter({ hasText: "Bob" });
  await bobRosterItem.getByRole("button", { name: "Make dealer" }).click();
  await expect(
    host.locator(".seat-tile").filter({ hasText: "Bob" }).getByLabel("Dealer"),
  ).toBeVisible();
});

test("Public Table, TV, and Tablet Control links remain role-safe", async ({
  context,
  page: host,
}) => {
  await createTableWithTwoPlayers(host, context);
  await host.getByRole("button", { name: /^Players/ }).click();

  async function openRoleSurface(
    createButton: string,
    linkLabel: string,
  ): Promise<Page> {
    await host.getByRole("button", { name: createButton }).click();
    const invitationUrl = await host.getByLabel(linkLabel).inputValue();
    const surface = await context.newPage();
    await surface.goto(invitationUrl);
    await expect(
      surface.getByRole("heading", { name: "Public table" }),
    ).toBeVisible();
    return surface;
  }

  const publicTable = await openRoleSurface(
    "Create Public Table link",
    "Public Table invitation link",
  );
  const tv = await openRoleSurface("Create TV link", "TV invitation link");
  const tablet = await openRoleSurface(
    "Create Tablet Control link",
    "Tablet Control invitation link",
  );

  await expect(publicTable.locator("[data-private-card]")).toHaveCount(0);
  await expect(tv.locator("[data-private-card]")).toHaveCount(0);
  await expect(tablet.locator("[data-private-card]")).toHaveCount(0);
  await expect(publicTable.getByLabel("Dealer controls")).toHaveCount(0);
  await expect(tv.getByLabel("Dealer controls")).toHaveCount(0);
  await expect(tablet.getByLabel("Dealer controls")).toHaveCount(0);
  await expect(tablet.locator("[data-table-corner]")).toHaveCount(4);

  await tablet
    .getByRole("button", { name: "Open table controls from lower right" })
    .click();
  await tablet.getByRole("button", { name: "Next card" }).click();
  await expect(host.getByText("Flop", { exact: true }).first()).toBeVisible();
  await expect(publicTable.locator("[data-board-card]")).toHaveCount(3);
  await expect(tv.locator("[data-board-card]")).toHaveCount(3);

  await host
    .getByRole("button", { name: "Close player administration" })
    .click();
  await host.getByRole("button", { name: /^Players/ }).click();
  const tabletCapability = host
    .locator(".capability-list li")
    .filter({ hasText: "table control" });
  await tabletCapability.getByRole("button", { name: "Revoke" }).click();
  await expect(
    tablet.getByRole("heading", {
      name: "This room surface could not be opened",
    }),
  ).toBeVisible();
  await expect(tablet.getByText("credential-revoked")).toBeVisible();
});
