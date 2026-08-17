import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type TestInfo,
} from "@playwright/test";

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
  await host.getByRole("button", { name: "Create table" }).click();
  const alice = await joinPlayer(host, context, "Alice");
  const bob = await joinPlayer(host, context, "Bob");
  await host.getByRole("button", { name: "Deal first hand" }).click();
  await expect(alice.locator("[data-private-card]")).toHaveCount(2);
  return { alice, bob };
}

async function endCurrentHand(host: Page): Promise<void> {
  await host.getByRole("button", { name: "End hand" }).click();
  await host.getByRole("button", { name: "End this hand" }).click();
  await expect(
    host.getByText("Hand complete", { exact: true }).first(),
  ).toBeVisible();
}

async function hostRevision(host: Page): Promise<number> {
  const label = await host.locator(".table-status span").first().textContent();
  const revision = Number(label?.replace(/^r/u, ""));
  if (!Number.isSafeInteger(revision)) {
    throw new Error(`Invalid host revision label: ${label ?? "missing"}`);
  }
  return revision;
}

async function screenshotIfChromium(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  if (testInfo.project.name !== "chromium") return;
  await page.evaluate(async () => document.fonts.ready);
  await expect(page).toHaveScreenshot(`${name}.png`, {
    animations: "disabled",
    fullPage: true,
  });
}

test("Home can open a pasted player invitation and exposes an in-page QR scanner", async ({
  context,
  page: host,
}, testInfo: TestInfo) => {
  await host.setViewportSize({ height: 852, width: 393 });
  await host.goto("/");
  await expect(
    host.getByRole("heading", { name: "Join another session" }),
  ).toBeVisible();
  await screenshotIfChromium(host, testInfo, "phone-home");
  await host.getByRole("button", { name: "Create table" }).click();
  const invitationUrl = await host
    .getByLabel("Player invitation link")
    .inputValue();

  const joiner = await context.newPage();
  await joiner.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new DOMException(
            "blocked for deterministic QA",
            "NotAllowedError",
          );
        },
      },
    });
  });
  await joiner.setViewportSize({ height: 852, width: 393 });
  await joiner.goto("/");
  await joiner.getByLabel("Invitation URL").fill(invitationUrl);
  await joiner.getByRole("button", { name: "Open invitation" }).click();
  await expect(
    joiner.getByRole("heading", { name: "Join this table" }),
  ).toBeVisible();
  await screenshotIfChromium(joiner, testInfo, "phone-join");

  const scanner = await context.newPage();
  await scanner.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new DOMException(
            "blocked for deterministic QA",
            "NotAllowedError",
          );
        },
      },
    });
  });
  await scanner.goto("/");
  await scanner.getByRole("button", { name: "Scan invitation QR" }).click();
  const cameraDialog = scanner.getByRole("dialog", {
    name: "Scan player invitation QR",
  });
  await expect(cameraDialog).toBeVisible();
  await expect(cameraDialog.getByText("Use a saved QR image")).toBeVisible();
  await expect(cameraDialog.locator("input[type='file']")).toHaveCount(1);
  await expect(
    cameraDialog.getByText("Nothing from the camera leaves this device."),
  ).toBeVisible();
});

test("Player catches up to new hands, can return from sit-out, and can leave permanently", async ({
  context,
  page: host,
}, testInfo: TestInfo) => {
  const { alice } = await createTable(host, context);
  await alice.setViewportSize({ height: 852, width: 393 });
  await screenshotIfChromium(alice, testInfo, "phone-player-active-covered");
  await host.getByRole("button", { name: /^Players/u }).click();
  await joinPlayer(host, context, "Carol");
  await host
    .getByRole("button", { name: "Close player administration" })
    .click();
  await expect(
    host.getByRole("complementary", { name: "Player administration" }),
  ).toHaveCount(0);
  const recoveryUrl = alice.url();
  const navigationCount = await alice.evaluate(
    () => performance.getEntriesByType("navigation").length,
  );

  await host.getByRole("button", { name: /^Players/u }).click();
  await host.getByRole("button", { name: "Black Gold" }).click();
  await expect(alice.locator(".table-surface")).toHaveAttribute(
    "data-theme",
    "black-gold",
  );
  await host
    .getByRole("button", { name: "Close player administration" })
    .click();
  await expect(
    host.getByRole("complementary", { name: "Player administration" }),
  ).toHaveCount(0);

  const beforeSitOut = await hostRevision(host);
  await alice.getByLabel("Sit out next hand").click();
  await expect.poll(() => hostRevision(host)).toBeGreaterThan(beforeSitOut);
  await expect(alice.getByLabel("Sit out next hand")).toBeChecked();
  await endCurrentHand(host);
  await host.getByRole("button", { name: "Deal next hand" }).click();

  await expect(alice.getByText("Sitting out", { exact: true })).toBeVisible();
  await expect(
    alice.getByRole("button", { name: "Return for next hand" }),
  ).toBeVisible();
  await expect(
    alice.getByRole("button", { name: "Refresh table status" }),
  ).toBeVisible();
  await expect(alice.locator(".message-shell--player-waiting")).toHaveAttribute(
    "data-theme",
    "black-gold",
  );
  await host.getByRole("button", { name: /^Players/u }).click();
  await host.getByRole("button", { name: "Dark Green" }).click();
  await expect(alice.locator(".message-shell--player-waiting")).toHaveAttribute(
    "data-theme",
    "dark-green",
  );
  await host
    .getByRole("button", { name: "Close player administration" })
    .click();
  await expect(
    host.getByRole("complementary", { name: "Player administration" }),
  ).toHaveCount(0);
  await screenshotIfChromium(alice, testInfo, "phone-player-sitting-out");
  const beforeReturn = await hostRevision(host);
  await alice.getByRole("button", { name: "Return for next hand" }).click();
  await expect.poll(() => hostRevision(host)).toBeGreaterThan(beforeReturn);
  await expect(
    alice.getByRole("button", { name: "Return for next hand" }),
  ).toHaveCount(0);
  await expect(
    alice.getByText("Ready for next hand", { exact: true }),
  ).toBeVisible();

  await endCurrentHand(host);
  await host.getByRole("button", { name: "Deal next hand" }).click();
  await expect(alice.locator("[data-private-card]")).toHaveCount(2);
  expect(
    await alice.evaluate(
      () => performance.getEntriesByType("navigation").length,
    ),
  ).toBe(navigationCount);

  await alice.getByRole("button", { name: "Leave table permanently" }).click();
  const confirmation = alice.getByRole("dialog", { name: "Leave this table?" });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "Leave permanently" }).click();
  await expect(
    alice.getByRole("heading", { name: "Join another session" }),
  ).toBeVisible();

  const staleSeat = await context.newPage();
  await staleSeat.goto(recoveryUrl);
  await expect(
    staleSeat.getByRole("heading", { name: "This seat could not be opened" }),
  ).toBeVisible();
  await expect(staleSeat.getByText(/revoked|no longer valid/iu)).toBeVisible();
});

test("Phone host shown cards are compact and showdown marks exactly the winning best five", async ({
  context,
  page: host,
}, testInfo: TestInfo) => {
  await host.setViewportSize({ height: 852, width: 393 });
  await host.addInitScript(() => {
    // Visual QA needs a stable shuffled deck. This replacement is scoped to
    // the isolated test page and is never part of the production runtime.
    let nextByte = 48;
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
          nextByte = (nextByte + 73) % 251;
        }
        return values;
      },
    });
  });
  const { alice, bob } = await createTable(host, context);
  await bob.getByRole("button", { name: "Fold", exact: true }).click();
  await host.getByRole("button", { name: "Deal the flop" }).click();
  await host.getByRole("button", { name: "Deal the turn" }).click();
  await host.getByRole("button", { name: "Deal the river" }).click();
  await alice.getByRole("button", { name: "Show cards to table" }).click();

  await expect(
    host.getByText("Best available shown hand is marked."),
  ).toBeVisible();
  await expect(host.locator("[data-best-five-card]")).toHaveCount(5);
  await expect(host.locator(".card--unused")).toHaveCount(2);

  const miniHand = host.locator(".mini-hand").filter({ hasText: "" }).first();
  await expect(miniHand.locator(".card--compact")).toHaveCount(2);
  await expect(miniHand.locator(".card--best")).toHaveCount(1);
  await expect(miniHand.locator(".card--unused")).toHaveCount(1);
  const selectedHoleOpacity = Number.parseFloat(
    await miniHand
      .locator(".card--best")
      .evaluate((element) => getComputedStyle(element).opacity),
  );
  const unusedHoleOpacity = Number.parseFloat(
    await miniHand
      .locator(".card--unused")
      .evaluate((element) => getComputedStyle(element).opacity),
  );
  expect(selectedHoleOpacity).toBeGreaterThan(unusedHoleOpacity);
  const compactCards = await miniHand.locator(".card--compact").all();
  const compactBoxes = await Promise.all(
    compactCards.map((card) => card.boundingBox()),
  );
  expect(compactBoxes.every(Boolean)).toBe(true);
  const first = compactBoxes[0];
  const second = compactBoxes[1];
  if (!first || !second) throw new Error("Compact cards did not render.");
  expect(second.x).toBeGreaterThanOrEqual(first.x + first.width);
  const miniBox = await miniHand.boundingBox();
  if (!miniBox) throw new Error("Mini hand did not render.");
  expect(second.x + second.width).toBeLessThanOrEqual(
    miniBox.x + miniBox.width + 0.5,
  );
  const shownSeatDecoration = await miniHand
    .locator("xpath=..")
    .evaluate((seat) => {
      const style = getComputedStyle(seat);
      return {
        borderWidths: [
          style.borderTopWidth,
          style.borderRightWidth,
          style.borderBottomWidth,
          style.borderLeftWidth,
        ],
        boxShadow: style.boxShadow,
      };
    });
  expect(new Set(shownSeatDecoration.borderWidths).size).toBe(1);
  expect(shownSeatDecoration.boxShadow).not.toContain("inset");
  for (const card of compactCards) {
    await expect(card.locator(".card__corner--bottom")).toBeHidden();
    await expect(card.locator(".card__pip")).toBeHidden();
    const compactStyle = await card.evaluate((element) => {
      const rankStyle = getComputedStyle(
        element.querySelector<HTMLElement>(".card__rank")!,
      );
      return {
        decoration: getComputedStyle(element, "::after").content,
        height: element.getBoundingClientRect().height,
        rankSize: Number.parseFloat(rankStyle.fontSize),
        width: element.getBoundingClientRect().width,
      };
    });
    expect(compactStyle.height / compactStyle.width).toBeLessThan(1.35);
    expect(compactStyle.rankSize).toBeGreaterThanOrEqual(16);
    expect(compactStyle.decoration).toBe("none");
  }
  expect(
    await host.evaluate(() =>
      Math.max(0, document.documentElement.scrollWidth - innerWidth),
    ),
  ).toBe(0);
  await expect(
    host.getByRole("button", { name: "End hand", exact: true }),
  ).toBeEnabled();

  await screenshotIfChromium(host, testInfo, "phone-host-showdown");
  const accessibility = await new AxeBuilder({ page: host }).analyze();
  expect(accessibility.violations).toEqual([]);

  await host.getByRole("button", { name: "Open table control center" }).click();
  const rootControls = host.getByRole("dialog", {
    name: "Table control center",
  });
  await expect(rootControls).toBeVisible();
  await screenshotIfChromium(host, testInfo, "phone-host-control-center");
  const rootAccessibility = await new AxeBuilder({ page: host }).analyze();
  expect(rootAccessibility.violations).toEqual([]);
  await rootControls
    .getByRole("button", { name: "Close table control center" })
    .click();

  await host.setViewportSize({ height: 1_024, width: 1_366 });
  await host.getByRole("button", { name: "Table View" }).click();
  const quietCards = host.locator(".quiet-shown-hand .card--compact");
  await expect(quietCards).toHaveCount(2);
  const quietCardStyle = await quietCards.first().evaluate((element) => ({
    decoration: getComputedStyle(element, "::after").content,
    rankSize: Number.parseFloat(
      getComputedStyle(element.querySelector<HTMLElement>(".card__rank")!)
        .fontSize,
    ),
  }));
  expect(quietCardStyle.decoration).not.toBe("none");
  expect(quietCardStyle.rankSize).toBeLessThan(16);
});

test("registered phone, tablet, desktop, and TV viewports remain free of clipping and horizontal overflow", async ({
  context,
  page: host,
}) => {
  const { alice } = await createTable(host, context);
  await alice
    .getByRole("button", { name: "Reveal my cards privately" })
    .click();

  async function expectNoHorizontalOverflow(page: Page): Promise<void> {
    expect(
      await page.evaluate(() =>
        Math.max(0, document.documentElement.scrollWidth - innerWidth),
      ),
    ).toBe(0);
  }

  for (const viewport of [
    { height: 780, width: 360 },
    { height: 852, width: 393 },
  ]) {
    await alice.setViewportSize(viewport);
    await expectNoHorizontalOverflow(alice);
    const cards = await alice.locator("[data-private-card]").all();
    await expect(alice.locator("[data-private-card]")).toHaveCount(2);
    for (const card of cards) {
      const rendered = await card.boundingBox();
      expect(rendered).not.toBeNull();
      if (rendered) {
        expect(rendered.x).toBeGreaterThanOrEqual(0);
        expect(rendered.x + rendered.width).toBeLessThanOrEqual(
          viewport.width + 0.5,
        );
      }
    }
    await expect(
      alice.getByRole("button", { name: "Hide my cards" }),
    ).toBeVisible();
  }

  await alice.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expectNoHorizontalOverflow(alice);
  await expect(
    alice.getByRole("button", { name: "Hide my cards" }),
  ).toBeVisible();

  await host.setViewportSize({ height: 1_000, width: 1_440 });
  await expectNoHorizontalOverflow(host);
  await host.getByRole("button", { name: "Deal the flop" }).click();
  await host.getByRole("button", { name: "Deal the turn" }).click();
  await host.getByRole("button", { name: "Deal the river" }).click();
  await host.getByRole("button", { name: "Table View" }).click();

  for (const viewport of [
    { height: 1_024, width: 1_366 },
    { height: 1_080, width: 1_920 },
  ]) {
    await host.setViewportSize(viewport);
    await expectNoHorizontalOverflow(host);
    await expect(host.locator("[data-board-card]")).toHaveCount(5);
    await expect(host.locator("[data-table-corner]")).toHaveCount(4);
    for (const card of await host.locator("[data-board-card]").all()) {
      const rendered = await card.boundingBox();
      expect(rendered).not.toBeNull();
      if (rendered) {
        expect(rendered.x).toBeGreaterThanOrEqual(0);
        expect(rendered.x + rendered.width).toBeLessThanOrEqual(
          viewport.width + 0.5,
        );
      }
    }
  }
});
