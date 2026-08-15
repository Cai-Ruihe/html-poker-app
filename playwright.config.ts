import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  expect: { timeout: 5_000 },
  fullyParallel: true,
  outputDir: "test-results/playwright",
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  testDir: "tests",
  testMatch: ["journey/**/*.spec.ts", "security/**/*.spec.ts"],
  use: {
    baseURL: "http://127.0.0.1:4173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "pnpm build && pnpm --filter @html-poker/web preview --host 127.0.0.1 --port 4173",
    reuseExistingServer: !process.env.CI,
    stderr: "pipe",
    stdout: "pipe",
    timeout: 30_000,
    url: "http://127.0.0.1:4173",
  },
  // GitHub's shared Linux runner has no LAN interface for two isolated browser
  // contexts to discover. Add Chromium's test-only loopback ICE interface,
  // expose those runner-local candidates, and serialize hardware-sensitive
  // WebRTC/QR journeys. Production browsers keep their normal privacy settings.
  ...(isCI ? { workers: 1 } : {}),
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(isCI
          ? {
              launchOptions: {
                args: [
                  "--allow-loopback-in-peer-connection",
                  "--disable-features=WebRtcHideLocalIpsWithMdns",
                ],
              },
            }
          : {}),
      },
    },
    { name: "mobile-webkit", use: { ...devices["iPhone 15"] } },
  ],
});
