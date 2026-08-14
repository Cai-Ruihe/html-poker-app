import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  expect: { timeout: 5_000 },
  fullyParallel: true,
  outputDir: "test-results/playwright",
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],
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
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-webkit", use: { ...devices["iPhone 15"] } },
  ],
});
