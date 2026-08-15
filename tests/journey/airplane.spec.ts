import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type TestInfo,
} from "@playwright/test";

test.describe.configure({ mode: "default" });

const airplanePath = path.join(
  process.cwd(),
  "dist",
  "airplane",
  "poker-airplane.html",
);
const airplaneUrl = pathToFileURL(airplanePath).toString();

function dataUrlFile(source: string, name: string) {
  const match = /^data:image\/png;base64,(.+)$/u.exec(source);
  if (!match?.[1]) throw new Error("Expected an inlined QR PNG.");
  return {
    buffer: Buffer.from(match[1], "base64"),
    mimeType: "image/png",
    name,
  };
}

async function openAirplanePage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto(airplaneUrl);
  await expect(
    page.getByRole("button", { name: "Create table" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Join an Airplane table" }),
  ).toBeVisible();
  return page;
}

async function pairPlayer(
  host: Page,
  player: Page,
  displayName: string,
): Promise<void> {
  const existingOffer = host.getByAltText("Player Airplane offer QR code");
  const previousOffer =
    (await existingOffer.count()) > 0
      ? await existingOffer.getAttribute("src")
      : null;
  const offerButton = previousOffer
    ? host.getByRole("button", { name: "New offer" }).first()
    : host.getByRole("button", { name: "Pair Player" });
  await offerButton.click();
  const offerImage = host.getByAltText("Player Airplane offer QR code");
  await expect(offerImage).toBeVisible();
  if (previousOffer) {
    await expect
      .poll(() => offerImage.getAttribute("src"))
      .not.toEqual(previousOffer);
  }
  const offerSource = await offerImage.getAttribute("src");
  if (!offerSource) throw new Error("The host offer QR did not render.");

  await player.getByRole("button", { name: "Join an Airplane table" }).click();
  await player.getByRole("button", { name: "Scan host offer QR" }).click();
  await player
    .getByRole("dialog", { name: "Scan host offer QR" })
    .getByLabel("Use a saved QR image")
    .setInputFiles(dataUrlFile(offerSource, `${displayName}-offer.png`));
  const answerImage = player.getByAltText("Airplane answer QR code");
  await expect(answerImage).toBeVisible({ timeout: 12_000 });
  const answerSource = await answerImage.getAttribute("src");
  if (!answerSource) throw new Error("The player answer QR did not render.");

  await host.getByRole("button", { name: "Scan Player answer QR" }).click();
  await host
    .getByRole("dialog", { name: "Scan Player answer QR" })
    .getByLabel("Use a saved QR image")
    .setInputFiles(dataUrlFile(answerSource, `${displayName}-answer.png`));
  await expect(
    host.getByText("Direct channel paired. The other device can now join."),
  ).toBeVisible({ timeout: 12_000 });
  await player.getByLabel("Display name").fill(displayName);
  await player.getByRole("button", { name: "Join after host scans" }).click();
  await expect(
    player.getByRole("heading", { name: "You have a seat" }),
  ).toBeVisible();
  await expect(host.getByText(displayName, { exact: true })).toBeVisible();
}

test("standalone artifact boots from file with no external request", async ({
  context,
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(airplaneUrl);

  await expect(page.getByRole("heading", { name: /Deal cards/ })).toBeVisible();
  expect(requests).toEqual([airplaneUrl]);
  const source = await readFile(airplanePath, "utf8");
  expect(source).not.toMatch(
    /<(?:script|link|img)\b[^>]*(?:src|href)="https?:/iu,
  );
  expect(source).toContain("airplaneMode:true");
  expect(source).toContain("html-poker-third-party-licenses");
  expect(source).toContain("html-poker-project-license");
  expect(await context.cookies()).toEqual([]);
});

test("host answer scan opens the live camera with an image fallback", async ({
  context,
}, testInfo: TestInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "Headless Mobile WebKit cannot create the prerequisite file-origin WebRTC offer; the join-side camera UI is still exercised there.",
  );
  const host = await openAirplanePage(context);
  await host.addInitScript(() => {
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          Reflect.set(globalThis, "__htmlPokerCameraRequests", 1);
          return new MediaStream();
        },
      },
    });
  });
  await host.reload();
  await host.getByRole("button", { name: "Create table" }).click();
  await host.getByRole("button", { name: "Pair Player" }).click();
  await expect(
    host.getByAltText("Player Airplane offer QR code"),
  ).toBeVisible();

  await host.getByRole("button", { name: "Scan Player answer QR" }).click();

  await expect(
    host.getByRole("dialog", { name: "Scan Player answer QR" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      host.evaluate(() => Reflect.get(globalThis, "__htmlPokerCameraRequests")),
    )
    .toBe(1);
  await expect(
    host.getByRole("button", { name: "Use a saved QR image" }),
  ).toBeVisible();
});

test("joining device scans the host offer with the live camera", async ({
  context,
}) => {
  await context.addInitScript(() => {
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          Reflect.set(globalThis, "__htmlPokerCameraRequests", 1);
          return new MediaStream();
        },
      },
    });
  });
  const player = await openAirplanePage(context);
  await player.getByRole("button", { name: "Join an Airplane table" }).click();

  await player.getByRole("button", { name: "Scan host offer QR" }).click();

  await expect(
    player.getByRole("dialog", { name: "Scan host offer QR" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      player.evaluate(() =>
        Reflect.get(globalThis, "__htmlPokerCameraRequests"),
      ),
    )
    .toBe(1);
  await expect(
    player.getByRole("button", { name: "Use a saved QR image" }),
  ).toBeVisible();
});

test("live camera frame decodes the host offer into an answer QR", async ({
  browser,
}, testInfo: TestInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "The deterministic canvas camera fixture and local file-origin WebRTC path are verified in Chromium; physical Mobile WebKit remains a release gate.",
  );
  const hostContext = await browser.newContext();
  const playerContext = await browser.newContext();
  try {
    const host = await openAirplanePage(hostContext);
    await host.getByRole("button", { name: "Create table" }).click();
    await host.getByRole("button", { name: "Pair Player" }).click();
    const offerImage = host.getByAltText("Player Airplane offer QR code");
    await expect(offerImage).toBeVisible();
    const offerSource = await offerImage.getAttribute("src");
    if (!offerSource) throw new Error("The host offer QR did not render.");

    await playerContext.addInitScript(async (source) => {
      Object.defineProperty(globalThis.navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: async () => {
            const image = new Image();
            image.src = source;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = 640;
            canvas.height = 640;
            const drawing = canvas.getContext("2d");
            if (!drawing) throw new Error("Camera fixture canvas unavailable.");
            const paintFrame = () => {
              drawing.fillStyle = "#ffffff";
              drawing.fillRect(0, 0, canvas.width, canvas.height);
              drawing.drawImage(image, 64, 64, 512, 512);
            };
            paintFrame();
            const stream = canvas.captureStream(10);
            const refresh = globalThis.setInterval(paintFrame, 100);
            for (const track of stream.getTracks()) {
              const stop = track.stop.bind(track);
              track.stop = () => {
                globalThis.clearInterval(refresh);
                stop();
              };
            }
            return stream;
          },
        },
      });
    }, offerSource);
    const player = await openAirplanePage(playerContext);
    await player
      .getByRole("button", { name: "Join an Airplane table" })
      .click();
    await player.getByRole("button", { name: "Scan host offer QR" }).click();

    await expect(player.getByAltText("Airplane answer QR code")).toBeVisible({
      timeout: 12_000,
    });
  } finally {
    await Promise.all([hostContext.close(), playerContext.close()]);
  }
});

test("two players pair by two-way QR and deal over direct local WebRTC", async ({
  browser,
}, testInfo: TestInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "Headless Mobile WebKit did not produce a local ICE candidate from file:// after an eight-second probe. Its file-origin WebRTC support remains a physical-device release gate, while Chromium supplies the automated direct-pairing evidence.",
  );
  const hostContext = await browser.newContext();
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();
  try {
    const host = await openAirplanePage(hostContext);
    const alice = await openAirplanePage(aliceContext);
    const bob = await openAirplanePage(bobContext);
    await host.getByRole("button", { name: "Create table" }).click();
    await expect(
      host.getByRole("heading", { name: "Waiting for players" }),
    ).toBeVisible();

    await pairPlayer(host, alice, "Alice");
    await pairPlayer(host, bob, "Bob");
    await host.getByRole("button", { name: "Deal first hand" }).click();

    await expect(
      alice.getByRole("heading", { name: "Your cards" }),
    ).toBeVisible();
    await expect(
      bob.getByRole("heading", { name: "Your cards" }),
    ).toBeVisible();
    await expect(alice.locator("[data-private-card]")).toHaveCount(2);
    await expect(bob.locator("[data-private-card]")).toHaveCount(2);
    await expect(
      alice.getByText("Airplane · direct WebRTC", { exact: true }),
    ).toBeVisible();

    await host.getByRole("button", { name: "Deal the flop" }).click();
    await expect(alice.locator("[data-board-card]")).toHaveCount(3);
    await expect(bob.locator("[data-board-card]")).toHaveCount(3);
    await expect(host.locator("[data-private-card]")).toHaveCount(0);
  } finally {
    await Promise.all([
      hostContext.close(),
      aliceContext.close(),
      bobContext.close(),
    ]);
  }
});
