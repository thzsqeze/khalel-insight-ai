import { defineConfig, devices } from "@playwright/test";
const baseURL = process.env.PW_BASE_URL || "http://127.0.0.1:3100";
export default defineConfig({
  testDir: "./e2e", fullyParallel: false, workers: 1, timeout: 60000,
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PW_BASE_URL ? undefined : { command: "pnpm dev --hostname 127.0.0.1 --port 3100", env: { DEMO_MODE: "true", APP_ORIGIN: baseURL, DEMO_DB_PATH: `.data/playwright-${process.pid}.sqlite` }, url: baseURL, reuseExistingServer: !process.env.CI, timeout: 120000 },
});
