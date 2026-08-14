import { expect, test, type BrowserContext, type Page } from "@playwright/test";

async function join(
  host: Page,
  context: BrowserContext,
  name: string,
): Promise<Page> {
  const invitationUrl = await host
    .getByLabel("Player invitation link")
    .inputValue();
  const player = await context.newPage();
  await player.goto(invitationUrl);
  await player.getByLabel("Display name").fill(name);
  await player.getByRole("button", { name: "Join table" }).click();
  await expect(
    player.getByRole("heading", { name: "You have a seat" }),
  ).toBeVisible();
  return player;
}

test("hostile names stay inert and private cards stop at the seat projection", async ({
  context,
  page: host,
}) => {
  const pageErrors: string[] = [];
  context.on("page", (page) =>
    page.on("pageerror", (error) => pageErrors.push(error.message)),
  );
  host.on("pageerror", (error) => pageErrors.push(error.message));
  const hostileName = "<img src=x onerror=globalThis.pwn=1>";

  await host.goto("/");
  await host.getByRole("button", { name: "Create table" }).click();
  const hostilePlayer = await join(host, context, hostileName);
  const bob = await join(host, context, "Bob");
  await expect(host.getByText(hostileName, { exact: true })).toBeVisible();
  expect(await host.evaluate(() => "pwn" in globalThis)).toBeFalsy();
  await expect(host.locator('img[src="x"]')).toHaveCount(0);

  await host.getByRole("button", { name: "Deal first hand" }).click();
  await expect(hostilePlayer.locator("[data-private-card]")).toHaveCount(2);
  const firstSeatCard = await hostilePlayer
    .locator("[data-private-card]")
    .first()
    .getAttribute("data-card");
  expect(firstSeatCard).toBeTruthy();
  await expect(bob.locator(`[data-card="${firstSeatCard}"]`)).toHaveCount(0);
  await expect(host.locator("[data-private-card]")).toHaveCount(0);
  await expect(host.locator(`[data-card="${firstSeatCard}"]`)).toHaveCount(0);

  const browserStorage = await host.evaluate(() => ({
    local: globalThis.localStorage.length,
    session: globalThis.sessionStorage.length,
  }));
  expect(browserStorage).toEqual({ local: 0, session: 0 });
  expect(pageErrors).toEqual([]);
});
