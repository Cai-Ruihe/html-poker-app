import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";

const referenceViewport = { height: 1_024, width: 1_366 };

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
  await host.setViewportSize(referenceViewport);
  await host.goto("/");
  await host.getByRole("button", { name: "Create table" }).click();
  const alice = await joinPlayer(host, context, "Alice");
  const bob = await joinPlayer(host, context, "Bob");
  await host.getByRole("button", { name: "Deal first hand" }).click();
  await expect(alice.locator("[data-private-card]")).toHaveCount(2);
  return { alice, bob };
}

async function box(locator: Locator) {
  const value = await locator.boundingBox();
  expect(value, "element must have a rendered bounding box").not.toBeNull();
  if (!value) throw new Error("Expected a rendered bounding box.");
  return value;
}

function expectNear(
  actual: number,
  expected: number,
  tolerance: number,
  label: string,
): void {
  expect(
    Math.abs(actual - expected),
    `${label}: expected ${expected} +/- ${tolerance}, received ${actual}`,
  ).toBeLessThanOrEqual(tolerance);
}

async function openCorner(
  host: Page,
  corner: "lower left" | "lower right" | "upper left" | "upper right",
): Promise<Locator> {
  await host
    .getByRole("button", { name: `Open table controls from ${corner}` })
    .click();
  const panel = host.getByRole("region", { name: "Table controls" });
  await expect(panel).toBeVisible();
  return panel;
}

async function closeQuickPanel(host: Page): Promise<void> {
  await host.getByRole("button", { name: "Close table controls" }).click();
  await expect(host.locator("[data-control-facing]")).toHaveCount(0);
}

async function installDeterministicEntropy(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Stable host entropy makes the full card artwork screenshot-testable.
    // This is isolated to the QA page and is never bundled into production.
    let nextByte = 41;
    Object.defineProperty(globalThis.crypto, "getRandomValues", {
      configurable: true,
      value: <T extends ArrayBufferView>(values: T): T => {
        const bytes = new Uint8Array(
          values.buffer,
          values.byteOffset,
          values.byteLength,
        );
        for (let index = 0; index < bytes.length; index += 1) {
          bytes[index] = nextByte;
          nextByte = (nextByte + 67) % 251;
        }
        return values;
      },
    });
  });
}

async function prepareScreenshot(page: Page): Promise<void> {
  await page.addStyleTag({
    content: "*{caret-color:transparent!important}",
  });
  await page.evaluate(async () => document.fonts.ready);
}

async function screenshotIfChromium(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  if (testInfo.project.name !== "chromium") return;
  await expect(page).toHaveScreenshot(`${name}.png`, {
    animations: "disabled",
    fullPage: false,
  });
}

test("Tablet quiet and quick-control states conform to approved geometry", async ({
  context,
  page: host,
}, testInfo) => {
  await installDeterministicEntropy(host);
  await createTable(host, context);
  await host.getByRole("button", { name: "Deal the flop" }).click();
  await host.getByRole("button", { name: "Deal the turn" }).click();
  await host.getByRole("button", { name: "Deal the river" }).click();
  await host.getByRole("button", { name: "Table View" }).click();

  await expect(host.locator("[data-table-corner]")).toHaveCount(4);
  await expect(host.locator("[data-board-card]")).toHaveCount(5);
  await expect(host.locator("[data-seat-edge-status]")).toHaveCount(2);
  for (const rejectedText of ["Board", "END", "More", "Unlock"]) {
    await expect(host.getByText(rejectedText, { exact: true })).toHaveCount(0);
  }
  await expect(host.locator("input[type='range']")).toHaveCount(0);
  await expect(host.getByText("D", { exact: true })).toBeVisible();
  await expect(host.getByText("SB", { exact: true })).toBeVisible();
  await expect(host.getByText("BB", { exact: true })).toBeVisible();

  const boardCards = host.locator("[data-board-card]");
  const firstCard = await box(boardCards.nth(0));
  const lastCard = await box(boardCards.nth(4));
  expect(lastCard.x + lastCard.width - firstCard.x).toBeGreaterThan(1_000);
  for (let index = 1; index < 5; index += 1) {
    const previous = await box(boardCards.nth(index - 1));
    const current = await box(boardCards.nth(index));
    expect(current.x).toBeGreaterThan(previous.x + previous.width);
  }
  expect(
    await host.evaluate(() =>
      Math.max(0, document.documentElement.scrollWidth - innerWidth),
    ),
  ).toBe(0);
  for (const target of await host.locator("[data-table-corner]").all()) {
    const targetBox = await box(target);
    expect(targetBox.width).toBeGreaterThanOrEqual(52);
    expect(targetBox.height).toBeGreaterThanOrEqual(52);
  }

  await prepareScreenshot(host);
  await screenshotIfChromium(host, testInfo, "tablet-quiet-dark-green");

  for (const corner of [
    "upper left",
    "upper right",
    "lower left",
    "lower right",
  ] as const) {
    const panel = await openCorner(host, corner);
    await expect(panel).toHaveAttribute(
      "data-control-facing",
      corner.startsWith("upper") ? "upper" : "lower",
    );
    const transform = await panel
      .locator(".tablet-quick-panel__content")
      .evaluate((element) => getComputedStyle(element).transform);
    if (corner.startsWith("upper")) {
      expect(transform).not.toBe("none");
      expect(transform).toMatch(/^matrix\(-1, 0, 0, -1,/u);
    } else {
      expect(transform).toBe("none");
    }
    if (corner === "upper right") {
      await screenshotIfChromium(host, testInfo, "tablet-quick-upper-right");
    }
    await closeQuickPanel(host);
  }

  const panel = await openCorner(host, "lower right");
  const panelBox = await box(panel);
  expectNear(panelBox.width, 650, 2, "quick panel width");
  expectNear(panelBox.height, 244, 2, "quick panel height");

  const utilityButtons = panel.locator(".tablet-quick-panel__utilities button");
  await expect(utilityButtons).toHaveCount(2);
  const utilityOne = await box(utilityButtons.nth(0));
  const utilityTwo = await box(utilityButtons.nth(1));
  expectNear(utilityOne.width, 52, 1, "more target width");
  expectNear(utilityOne.height, 52, 1, "more target height");
  expectNear(
    utilityTwo.x - utilityOne.x - utilityOne.width,
    20,
    1,
    "utility gap",
  );

  const nextCard = await box(panel.getByRole("button", { name: "Next card" }));
  const nextHand = await box(panel.locator(".next-hand-control"));
  expectNear(nextCard.width, 190, 2, "Next Card width");
  expectNear(nextCard.height, 102, 2, "Next Card height");
  expectNear(nextHand.width, 374, 2, "Next Hand width");
  expectNear(nextHand.height, 102, 2, "Next Hand height");
  expectNear(nextHand.x - nextCard.x - nextCard.width, 18, 1, "action gap");

  const slider = panel.getByRole("slider", {
    name: "Slide to deal next hand",
  });
  const sliderBox = await box(slider);
  const handle = slider.locator(".next-hand-slider__handle");
  const handleBox = await box(handle);
  expectNear(sliderBox.width, 156, 1, "slider track width");
  expectNear(sliderBox.height, 64, 1, "slider track height");
  expectNear(handleBox.width, 64, 1, "slider handle width");
  expectNear(handleBox.height, 64, 1, "slider handle height");
  expect(await slider.getAttribute("data-slider-travel")).toBe("92");
  expect(
    await slider.evaluate((element) => getComputedStyle(element).borderRadius),
  ).toBe("32px");
  expect(
    await handle.evaluate((element) => getComputedStyle(element).borderRadius),
  ).toBe("32px");
  await expect(handle.locator(".slider-grip i")).toHaveCount(3);
  const visibleThread = panel.locator(
    ".tablet-quick-panel__gold-thread path:visible",
  );
  await expect(visibleThread).toHaveCount(1);
  expect(
    await visibleThread.evaluate(
      (element) => getComputedStyle(element).strokeWidth,
    ),
  ).toBe("4px");

  await screenshotIfChromium(host, testInfo, "tablet-quick-lower-right");
  await panel.getByRole("button", { name: "More table controls" }).click();
  const secondary = host.locator(".secondary-controls");
  await expect(secondary).toBeVisible();
  for (const label of [
    "Players & seats",
    "Appearance",
    "Displays & pairing",
    "This device",
    "Connection & recovery",
    "Diagnostics & history",
  ]) {
    await expect(secondary.getByText(label, { exact: true })).toBeVisible();
  }
  const secondaryBox = await box(secondary);
  expectNear(
    secondaryBox.x + secondaryBox.width / 2,
    referenceViewport.width / 2,
    2,
    "secondary panel horizontal center",
  );
  expectNear(
    secondaryBox.y + secondaryBox.height / 2,
    referenceViewport.height / 2,
    2,
    "secondary panel vertical center",
  );
  await screenshotIfChromium(host, testInfo, "tablet-secondary-dark-green");

  const accessibility = await new AxeBuilder({ page: host }).analyze();
  expect(accessibility.violations).toEqual([]);

  await secondary.getByRole("button", { name: "Black Gold" }).click();
  await expect(host.locator(".table-surface")).toHaveAttribute(
    "data-theme",
    "black-gold",
  );
  await secondary.getByRole("button", { name: "Return to table" }).click();
  expectNear(
    (await box(boardCards.nth(0))).width,
    firstCard.width,
    0.5,
    "Black Gold card geometry",
  );
  await screenshotIfChromium(host, testInfo, "tablet-quiet-black-gold");

  await openCorner(host, "lower right");
  await host.getByRole("button", { name: "More table controls" }).click();
  const navySecondary = host.locator(".secondary-controls");
  await navySecondary.getByRole("button", { name: "Deep Navy" }).click();
  await expect(host.locator(".table-surface")).toHaveAttribute(
    "data-theme",
    "deep-navy",
  );
  await navySecondary.getByRole("button", { name: "Return to table" }).click();
  expectNear(
    (await box(boardCards.nth(0))).width,
    firstCard.width,
    0.5,
    "Deep Navy card geometry",
  );
  await screenshotIfChromium(host, testInfo, "tablet-quiet-deep-navy");
});

test("every host Tablet secondary action is exercised and player administration mutates state", async ({
  context,
  page: host,
}, testInfo) => {
  await installDeterministicEntropy(host);
  const { alice, bob } = await createTable(host, context);
  await host.getByRole("button", { name: "Table View" }).click();
  const expectedActionIds = [
    "close-secondary",
    "fullscreen",
    "host-controls",
    "manage-displays",
    "manage-players",
    "reconnect",
    "return-table",
    "save-log",
    "theme-black-gold",
    "theme-dark-green",
    "theme-deep-navy",
  ].sort();
  const exercisedActionIds = new Set<string>();

  async function openSecondary(): Promise<Locator> {
    await openCorner(host, "lower right");
    await host.getByRole("button", { name: "More table controls" }).click();
    const secondary = host.locator(".secondary-controls");
    await expect(secondary).toBeVisible();
    return secondary;
  }

  let secondary = await openSecondary();
  expect(
    (
      await secondary
        .locator("[data-qa-action]")
        .evaluateAll((actions) =>
          actions.map((action) => action.getAttribute("data-qa-action")),
        )
    ).sort(),
  ).toEqual(expectedActionIds);

  async function invokeSecondary(actionId: string): Promise<void> {
    await secondary.locator(`[data-qa-action="${actionId}"]`).click();
    exercisedActionIds.add(actionId);
  }

  await invokeSecondary("theme-dark-green");
  await invokeSecondary("theme-deep-navy");
  await invokeSecondary("theme-black-gold");
  for (const screen of [host, alice, bob]) {
    await expect(screen.locator(".table-surface")).toHaveAttribute(
      "data-theme",
      "black-gold",
    );
  }

  await host.evaluate(() => {
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: async () => {
        document.documentElement.dataset.fullscreenRequested = "true";
      },
    });
  });
  await invokeSecondary("fullscreen");
  await expect(host.locator("html")).toHaveAttribute(
    "data-fullscreen-requested",
    "true",
  );
  await invokeSecondary("reconnect");
  await expect(secondary).toBeVisible();
  const downloadPromise = host.waitForEvent("download");
  await invokeSecondary("save-log");
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("diagnostics.json");

  await invokeSecondary("return-table");
  await expect(secondary).toHaveCount(0);
  secondary = await openSecondary();
  await invokeSecondary("close-secondary");
  await expect(secondary).toHaveCount(0);
  secondary = await openSecondary();
  await invokeSecondary("host-controls");
  await expect(
    host.getByRole("button", { name: "Host Controls" }),
  ).toHaveAttribute("aria-pressed", "true");

  await host.getByRole("button", { name: "Table View" }).click();
  secondary = await openSecondary();
  await invokeSecondary("manage-players");
  const administration = host.getByRole("complementary", {
    name: "Player administration",
  });
  await expect(administration).toBeVisible();
  await expect(administration).toHaveAttribute("data-admin-focus", "players");
  await expect(
    host.getByRole("button", { name: "Host Controls" }),
  ).toHaveAttribute("aria-pressed", "true");
  const roster = administration.locator(".roster");
  await expect(roster).toBeInViewport();
  await expect(
    roster.getByText("2 of 10 joined", { exact: true }),
  ).toBeVisible();
  await expect(
    roster.getByRole("button", { name: "Close join window" }),
  ).toBeVisible();
  await expect(
    roster.getByRole("button", { name: "Replace device" }),
  ).toHaveCount(2);
  expect((await box(roster)).y).toBeLessThan(
    (await box(administration.locator(".invite-panel"))).y,
  );
  await prepareScreenshot(host);
  await screenshotIfChromium(host, testInfo, "tablet-manage-players");
  await administration.getByRole("button", { name: "Move Bob up" }).click();
  await expect(administration.locator(".roster li strong").first()).toHaveText(
    "Bob",
  );

  await host
    .getByRole("button", { name: "Close player administration" })
    .click();
  await host.getByRole("button", { name: "Table View" }).click();
  secondary = await openSecondary();
  await invokeSecondary("manage-displays");
  await expect(administration).toBeVisible();
  await expect(administration).toHaveAttribute("data-admin-focus", "displays");
  const displayAdministration = administration.locator(".role-invitations");
  await expect(displayAdministration).toBeInViewport();
  expect((await box(displayAdministration)).y).toBeLessThan(
    (await box(administration.locator(".roster"))).y,
  );
  await expect(
    administration.getByRole("button", { name: "Create Tablet Control link" }),
  ).toBeVisible();
  expect([...exercisedActionIds].sort()).toEqual(expectedActionIds);
});

test("the short physical slider supports drag and double-click with automatic panel closure", async ({
  context,
  page: host,
}) => {
  await createTable(host, context);
  await host.getByRole("button", { name: "Table View" }).click();

  await openCorner(host, "lower right");
  let slider = host.getByRole("slider", {
    name: "Slide to deal next hand",
  });
  const track = await box(slider);
  await host.mouse.move(track.x + 32, track.y + 32);
  await host.mouse.down();
  await host.mouse.move(track.x + 124, track.y + 32, { steps: 8 });
  await host.mouse.up();
  await expect(host.locator("[data-control-facing]")).toHaveCount(0);

  await openCorner(host, "lower right");
  await host.getByRole("button", { name: "More table controls" }).click();
  await host.getByRole("button", { name: "Host Controls" }).click();
  await expect(
    host.getByText("Hand complete", { exact: true }).first(),
  ).toBeVisible();

  await host.getByRole("button", { name: "Table View" }).click();
  await openCorner(host, "upper left");
  slider = host.getByRole("slider", { name: "Slide to deal next hand" });
  await slider.dblclick();
  await expect(host.locator("[data-control-facing]")).toHaveCount(0);
  await openCorner(host, "upper left");
  await host.getByRole("button", { name: "More table controls" }).click();
  await host.getByRole("button", { name: "Host Controls" }).click();
  await expect(
    host.getByText("Pre-flop", { exact: true }).first(),
  ).toBeVisible();
});
