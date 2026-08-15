import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

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
  await expect(
    alice.getByRole("heading", { name: "Your cards" }),
  ).toBeVisible();
  await expect(bob.getByRole("heading", { name: "Your cards" })).toBeVisible();
  return { alice, bob };
}

test("host and two player devices complete a private deal-only hand without external requests", async ({
  context,
  page: host,
}) => {
  const unexpectedRequests: string[] = [];
  context.on("page", (page) => {
    page.on("request", (request) => {
      const requestUrl = new URL(request.url());
      if (requestUrl.origin !== "http://127.0.0.1:4173") {
        unexpectedRequests.push(request.url());
      }
    });
  });
  host.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.origin !== "http://127.0.0.1:4173") {
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
  await bob.getByRole("button", { name: "Muck" }).click();
  await expect(host.getByText("mucked", { exact: true })).toBeVisible();

  await host.getByRole("button", { name: "Deal the turn" }).click();
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
    bob.getByRole("button", { name: "Muck" }).click(),
  ]);

  await expect(host.locator("[data-shown-card]")).toHaveCount(2);
  await expect(host.getByText("mucked", { exact: true })).toBeVisible();
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
  await expect(
    alice.getByRole("heading", { name: "Your cards" }),
  ).toBeVisible();
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
    replacement.getByRole("heading", { name: "Your cards" }),
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
  await expect(tablet.getByLabel("Dealer controls")).toBeVisible();

  await tablet.getByRole("button", { name: "Deal the flop" }).click();
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
