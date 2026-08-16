import { mkdir } from "node:fs/promises";

import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type TestInfo,
} from "@playwright/test";

async function captureApprovedUi(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  if (process.env.HTML_POKER_CAPTURE_UI !== "1") return;
  await mkdir("output/playwright", { recursive: true });
  await page.screenshot({
    animations: "disabled",
    path: `output/playwright/${testInfo.project.name}-${name}.png`,
  });
}

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
  return player;
}

async function createTable(
  host: Page,
  context: BrowserContext,
): Promise<{ readonly alice: Page; readonly bob: Page }> {
  await host.goto("/");
  await expect(host.getByLabel("Digital chips")).toHaveCount(0);
  await host.getByRole("button", { name: "Create table" }).click();
  const alice = await joinPlayer(host, context, "Alice");
  const bob = await joinPlayer(host, context, "Bob");
  await host.getByRole("button", { name: "Deal first hand" }).click();
  await expect(alice.getByRole("region", { name: "Your cards" })).toBeVisible();
  return { alice, bob };
}

test("the approved theme and dimensional card system is shared by every role", async ({
  context,
  page: host,
}, testInfo) => {
  const { alice, bob } = await createTable(host, context);

  for (const page of [host, alice, bob]) {
    await expect(page.locator(".table-surface")).toHaveAttribute(
      "data-theme",
      "dark-green",
    );
  }
  await expect(alice.locator(".card__corner--bottom")).toHaveCount(2);
  await expect(
    alice.getByRole("button", { name: "Reconnect to table" }),
  ).toBeAttached();
  await alice
    .getByRole("button", { name: "Reveal my cards privately" })
    .click();
  await captureApprovedUi(alice, testInfo, "player-dark-green");
  await captureApprovedUi(host, testInfo, "host-dark-green");

  await host.getByRole("button", { name: /^Players/ }).click();
  await host.getByRole("button", { name: "Black Gold" }).click();
  for (const page of [host, alice, bob]) {
    await expect(page.locator(".table-surface")).toHaveAttribute(
      "data-theme",
      "black-gold",
    );
  }
  await host
    .getByRole("button", { name: "Close player administration" })
    .click();
  await captureApprovedUi(host, testInfo, "host-black-gold");

  await host.getByRole("button", { name: /^Players/ }).click();
  await host.getByRole("button", { name: "Deep Navy" }).click();
  await expect(host.locator(".table-surface")).toHaveAttribute(
    "data-theme",
    "deep-navy",
  );
  await host
    .getByRole("button", { name: "Close player administration" })
    .click();
  await captureApprovedUi(host, testInfo, "host-deep-navy");

  await host.getByRole("button", { name: /^Players/ }).click();
  await host.getByRole("button", { name: "Black Gold" }).click();
  await host
    .getByRole("button", { name: "Close player administration" })
    .click();

  await host.reload();
  await expect(host.locator(".table-surface")).toHaveAttribute(
    "data-theme",
    "black-gold",
  );
});

test("Tablet quiet mode gives all four sides equal guarded controls", async ({
  context,
  page: host,
}, testInfo) => {
  await createTable(host, context);
  await host.getByRole("button", { name: "Table View" }).click();

  await expect(host.getByText("Board", { exact: true })).toHaveCount(0);
  await expect(host.locator(".table-bar")).toHaveCount(0);
  await expect(host.locator(".dealer-dock")).toHaveCount(0);
  await expect(host.locator("[data-table-corner]")).toHaveCount(4);
  await expect(host.locator("[data-seat-edge-status]")).toHaveCount(2);
  await expect(host.getByText("D", { exact: true })).toBeVisible();
  await expect(host.getByText("SB", { exact: true })).toBeVisible();
  await expect(host.getByText("BB", { exact: true })).toBeVisible();
  await captureApprovedUi(host, testInfo, "tablet-quiet-dark-green");

  await host
    .getByRole("button", { name: "Open table controls from upper right" })
    .click();
  await expect(host.locator("[data-control-facing='upper']")).toBeVisible();
  await expect(host.getByRole("button", { name: "Next card" })).toBeVisible();
  await expect(
    host.getByRole("slider", { name: "Slide to deal next hand" }),
  ).toBeVisible();
  await captureApprovedUi(host, testInfo, "tablet-controls-upper");

  await host.getByRole("button", { name: "Next card" }).click();
  await expect(host.locator("[data-board-card]")).toHaveCount(3);
  await expect(host.locator("[data-control-facing]")).toHaveCount(0);
});
