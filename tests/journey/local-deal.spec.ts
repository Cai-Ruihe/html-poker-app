import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("host completes a private two-seat deal-only hand without external requests", async ({
  page,
}) => {
  const unexpectedRequests: string[] = [];
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.origin !== "http://127.0.0.1:4173")
      unexpectedRequests.push(request.url());
  });
  await page.goto("/");

  const bundledLicences = await page.evaluate(async () =>
    fetch("./THIRD-PARTY-LICENSES.txt").then((response) => response.text()),
  );
  expect(bundledLicences).toContain("MIT License");
  expect(bundledLicences).toContain("SIL OPEN FONT LICENSE Version 1.1");

  await expect(
    page.getByRole("heading", { name: "Deal the cards. Keep the table." }),
  ).toBeVisible();
  await page.getByLabel("First player").fill("Alice");
  await page.getByLabel("Second player").fill("Bob");
  await page.getByRole("button", { name: "Create table and deal" }).click();

  await expect(page.getByText("Pre-flop", { exact: true })).toBeVisible();
  await expect(page.locator("[data-private-card]")).toHaveCount(0);
  await expect(page.locator("[data-board-card]")).toHaveCount(0);

  await page.getByRole("button", { name: "View Alice's hand" }).click();
  const privateCards = page.locator("[data-private-card]");
  await expect(privateCards).toHaveCount(2);
  const firstPrivateCard = await privateCards.first().getAttribute("data-card");
  expect(firstPrivateCard).toBeTruthy();

  await page.getByRole("button", { name: "View Public Table" }).click();
  await expect(page.locator("[data-private-card]")).toHaveCount(0);
  await expect(page.locator(`[data-card="${firstPrivateCard}"]`)).toHaveCount(
    0,
  );

  await page.getByRole("button", { name: "Deal the flop" }).click();
  await expect(page.getByText("Flop", { exact: true })).toBeVisible();
  await expect(page.locator("[data-board-card]")).toHaveCount(3);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);

  await page.getByRole("button", { name: "View Alice's hand" }).click();
  await page.getByRole("button", { name: "Show cards" }).click();
  await page.getByRole("button", { name: "View Public Table" }).click();
  await expect(page.locator("[data-shown-card]")).toHaveCount(2);

  await page.getByRole("button", { name: "Deal the turn" }).click();
  await page.getByRole("button", { name: "Deal the river" }).click();
  await page.getByRole("button", { name: "End hand" }).click();
  await expect(page.getByText("Hand complete", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Deal next hand" }).click();
  await expect(page.getByText("Pre-flop", { exact: true })).toBeVisible();
  await expect(page.locator("[data-board-card]")).toHaveCount(0);
  await expect(page.locator("[data-shown-card]")).toHaveCount(0);
  expect(unexpectedRequests).toEqual([]);
});

test("rapid repeated dealer input commits only one transition", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Create table and deal" }).click();

  await page.getByRole("button", { name: "Deal the flop" }).dblclick();

  await expect(page.getByText("Flop", { exact: true })).toBeVisible();
  await expect(page.getByText("r3", { exact: true })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
