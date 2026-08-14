import { expect, test } from "@playwright/test";

test("hostile names stay inert and private cards leave the DOM at the role boundary", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const hostileName = '<img src=x onerror="globalThis.__pokerInjected=true">';

  await page.goto("/");
  await page.getByLabel("First player").fill(hostileName);
  await page.getByLabel("Second player").fill("Bob");
  await page.getByRole("button", { name: "Create table and deal" }).click();

  await expect(
    page.getByText(hostileName, { exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator("img")).toHaveCount(0);
  expect(
    await page.evaluate(() => "__pokerInjected" in globalThis),
  ).toBeFalsy();

  await page
    .getByRole("button", { name: `View ${hostileName}'s hand` })
    .click();
  const firstSeatCards = page.locator("[data-private-card]");
  await expect(firstSeatCards).toHaveCount(2);
  const firstSeatCard = await firstSeatCards.first().getAttribute("data-card");
  expect(firstSeatCard).toBeTruthy();

  await page.getByRole("button", { name: "View Bob's hand" }).click();
  await expect(page.locator("[data-private-card]")).toHaveCount(2);
  await expect(page.locator(`[data-card="${firstSeatCard}"]`)).toHaveCount(0);

  await page.getByRole("button", { name: "View Public Table" }).click();
  await expect(page.locator("[data-private-card]")).toHaveCount(0);
  await expect(page.locator(`[data-card="${firstSeatCard}"]`)).toHaveCount(0);

  const browserStorage = await page.evaluate(() => ({
    local: globalThis.localStorage.length,
    session: globalThis.sessionStorage.length,
  }));
  expect(browserStorage).toEqual({ local: 0, session: 0 });
  expect(pageErrors).toEqual([]);
});
