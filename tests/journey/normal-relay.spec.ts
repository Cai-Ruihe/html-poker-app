import { spawn, type ChildProcess } from "node:child_process";
import { request as httpRequest } from "node:http";

import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
  type TestInfo,
} from "@playwright/test";

const relayPort = 18_787;
const relayToken = "phase-1-test-operator-token";
let relay: ChildProcess | undefined;

test.describe.configure({ mode: "serial" });

function dataUrlFile(source: string, name: string) {
  const match = /^data:image\/png;base64,(.+)$/u.exec(source);
  if (!match?.[1]) throw new Error("Expected an inlined QR PNG.");
  return {
    buffer: Buffer.from(match[1], "base64"),
    mimeType: "image/png",
    name,
  };
}

async function waitForRelay(): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${relayPort}/health`);
      if (response.ok) return;
    } catch {
      // The bounded readiness loop retries while the service starts.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("The test Connection Service did not become ready.");
}

async function rejectedWebSocketUpgrade(): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    const request = httpRequest({
      headers: {
        connection: "Upgrade",
        origin: "https://untrusted.example.invalid",
        "sec-websocket-key": Buffer.alloc(16, 7).toString("base64"),
        "sec-websocket-version": "13",
        upgrade: "websocket",
      },
      host: "127.0.0.1",
      method: "GET",
      path: "/",
      port: relayPort,
    });
    request.once("response", (response) => resolve(response.statusCode));
    request.once("upgrade", () => resolve(101));
    request.once("error", reject);
    request.end();
  });
}

async function preflightMethods(): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const request = httpRequest({
      headers: {
        "access-control-request-headers": "authorization, content-type",
        "access-control-request-method": "POST",
        origin: "http://127.0.0.1:4173",
      },
      host: "127.0.0.1",
      method: "OPTIONS",
      path: "/v1/table-sessions",
      port: relayPort,
    });
    request.once("response", (response) => {
      response.resume();
      resolve(response.headers["access-control-allow-methods"]);
    });
    request.once("error", reject);
    request.end();
  });
}

function skipInsecureLocalRelayOnMobileWebKit(testInfo: TestInfo): void {
  test.skip(
    testInfo.project.name === "mobile-webkit",
    "This local harness uses HTTP/WS. The production CSP correctly permits only HTTPS/WSS; direct WebRTC and hosted relay verification run in Chromium until a trusted TLS fixture is available.",
  );
}

async function configuredContext(
  browser: Browser,
  disableDirectWebRtc = false,
): Promise<BrowserContext> {
  const context = await browser.newContext({ bypassCSP: true });
  await context.addInitScript(
    ({ disableDirect, url }) => {
      const configuredGlobal = globalThis as typeof globalThis & {
        __HTML_POKER_CONFIG__?: {
          privateRelay: { url: string };
        };
      };
      configuredGlobal.__HTML_POKER_CONFIG__ = {
        privateRelay: { url },
      };
      if (disableDirect) {
        Object.defineProperty(globalThis, "RTCPeerConnection", {
          configurable: true,
          value: undefined,
        });
      }
    },
    {
      disableDirect: disableDirectWebRtc,
      url: `ws://127.0.0.1:${relayPort}`,
    },
  );
  return context;
}

async function createConfiguredTable(host: Page): Promise<void> {
  await host.goto("/");
  await host.getByLabel("Private relay host token").fill(relayToken);
  await host.getByRole("button", { name: "Create table" }).click();
}

async function joinPlayer(
  host: Page,
  context: BrowserContext,
  name: string,
): Promise<Page> {
  const link = await host.getByLabel("Player invitation link").inputValue();
  const player = await context.newPage();
  await player.goto(link);
  await player.getByLabel("Display name").fill(name);
  await player.getByRole("button", { name: "Join table" }).click();
  await expect(
    player.getByRole("heading", { name: "You have a seat" }),
  ).toBeVisible();
  return player;
}

test.beforeAll(async ({ browserName }, testInfo) => {
  void browserName;
  if (testInfo.project.name === "mobile-webkit") return;
  relay = spawn(
    process.execPath,
    ["services/connection-service/dist/server.js"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        POKER_CONNECTION_ACCESS_TOKEN: relayToken,
        POKER_CONNECTION_ALLOWED_ORIGIN: "http://127.0.0.1:4173",
        POKER_CONNECTION_HOST: "127.0.0.1",
        POKER_CONNECTION_PORT: String(relayPort),
      },
      stdio: "ignore",
    },
  );
  await waitForRelay();
});

test.afterAll(() => {
  relay?.kill("SIGTERM");
});

test("the configured Connection Service rejects a different WebSocket origin", async ({
  browserName,
}, testInfo) => {
  void browserName;
  skipInsecureLocalRelayOnMobileWebKit(testInfo);
  await expect(rejectedWebSocketUpgrade()).resolves.toBe(403);
});

test("the Connection Service allows its POST ticket preflight", async ({
  browserName,
}, testInfo) => {
  void browserName;
  skipInsecureLocalRelayOnMobileWebKit(testInfo);
  await expect(preflightMethods()).resolves.toContain("POST");
});

test("an expired relay ticket is rejected before the browser opens a client connection", async ({
  page,
}) => {
  let websocketOpened = false;
  page.on("websocket", () => {
    websocketOpened = true;
  });
  const parameters = new URLSearchParams({
    build: "0.1.0-phase1",
    host: "host-key-a",
    join: "one-use-invitation-token",
    protocol: "1",
    "relay-expires": String(Date.now() - 1),
    "relay-route": "private-relay",
    "relay-token": "scoped-relay-ticket",
    "relay-url": "wss://relay.example.test/v1/relay",
    role: "player",
    table: "table-a",
  });

  await page.goto(`/#${parameters.toString()}`);

  await expect(
    page.getByRole("heading", { name: "Create a table" }),
  ).toBeVisible();
  expect(websocketOpened).toBe(false);
});

test("a host can renew its table-scoped relay ticket without exposing the operator token", async ({
  browser,
}, testInfo) => {
  skipInsecureLocalRelayOnMobileWebKit(testInfo);
  const hostContext = await configuredContext(browser);
  const aliceContext = await configuredContext(browser);
  try {
    const host = await hostContext.newPage();
    await createConfiguredTable(host);
    await joinPlayer(host, aliceContext, "Alice");

    await host.getByLabel("Private relay host token").fill(relayToken);
    await host.getByRole("button", { name: "Refresh relay ticket" }).click();
    await expect(
      host.getByText("Relay ticket refreshed", { exact: true }),
    ).toBeVisible();
    await expect(host.getByLabel("Player invitation link")).not.toHaveValue(
      new RegExp(relayToken),
    );
  } finally {
    await Promise.all([hostContext.close(), aliceContext.close()]);
  }
});

test("isolated devices prefer a direct WebRTC channel after private signaling", async ({
  browser,
}, testInfo) => {
  skipInsecureLocalRelayOnMobileWebKit(testInfo);
  const hostContext = await configuredContext(browser);
  const aliceContext = await configuredContext(browser);
  const bobContext = await configuredContext(browser);
  try {
    const host = await hostContext.newPage();
    await createConfiguredTable(host);
    const alice = await joinPlayer(host, aliceContext, "Alice");
    const bob = await joinPlayer(host, bobContext, "Bob");

    await host.getByRole("button", { name: "Deal first hand" }).click();
    await expect(
      alice.getByRole("heading", { name: "Your cards" }),
    ).toBeVisible();
    await expect(
      bob.getByRole("heading", { name: "Your cards" }),
    ).toBeVisible();
    await expect(
      alice.getByText("Direct WebRTC", { exact: true }),
    ).toBeVisible();
    await expect(bob.getByText("Direct WebRTC", { exact: true })).toBeVisible();
    await expect(alice.locator("[data-private-card]")).toHaveCount(2);
    await expect(bob.locator("[data-private-card]")).toHaveCount(2);

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

test("isolated devices fall back to the operator private relay when direct WebRTC is unavailable", async ({
  browser,
}, testInfo) => {
  skipInsecureLocalRelayOnMobileWebKit(testInfo);
  const hostContext = await configuredContext(browser, true);
  const aliceContext = await configuredContext(browser, true);
  const bobContext = await configuredContext(browser, true);
  try {
    const host = await hostContext.newPage();
    await createConfiguredTable(host);
    const alice = await joinPlayer(host, aliceContext, "Alice");
    const bob = await joinPlayer(host, bobContext, "Bob");

    await host.getByRole("button", { name: "Deal first hand" }).click();
    await expect(
      alice.getByRole("heading", { name: "Your cards" }),
    ).toBeVisible();
    await expect(
      bob.getByRole("heading", { name: "Your cards" }),
    ).toBeVisible();
    await expect(
      alice.getByText("Private relay", { exact: true }),
    ).toBeVisible();
    await expect(bob.getByText("Private relay", { exact: true })).toBeVisible();
  } finally {
    await Promise.all([
      hostContext.close(),
      aliceContext.close(),
      bobContext.close(),
    ]);
  }
});

test("an unpaired Normal TV receives its requested role only after host scan-pairing", async ({
  browser,
}, testInfo) => {
  skipInsecureLocalRelayOnMobileWebKit(testInfo);
  const hostContext = await configuredContext(browser);
  const tvContext = await configuredContext(browser);
  try {
    const host = await hostContext.newPage();
    const tv = await tvContext.newPage();
    await createConfiguredTable(host);
    await tv.goto("/");
    await tv.getByRole("button", { name: "Pair this display" }).click();
    await tv.getByRole("button", { name: "Pair as TV" }).click();
    const requestSource = await tv
      .getByAltText("TV display pairing QR code")
      .getAttribute("src");
    if (!requestSource) throw new Error("The display pairing QR is missing.");
    await expect(
      tv.getByText("Waiting for the host scan", { exact: true }),
    ).toBeVisible();
    await expect(tv.getByLabel("Dealer controls")).toHaveCount(0);

    await host
      .getByLabel("Scan display pairing QR")
      .setInputFiles(dataUrlFile(requestSource, "tv-pairing-request.png"));

    await expect(host.getByText("TV paired", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      tv.getByText("Connecting to the table", { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(tv.getByLabel("Dealer controls")).toHaveCount(0);
  } finally {
    await Promise.all([hostContext.close(), tvContext.close()]);
  }
});
