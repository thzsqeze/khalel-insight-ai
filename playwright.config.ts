import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
if (existsSync(".env.local")) loadEnvFile(".env.local");
const baseURL = process.env.PW_BASE_URL || "http://127.0.0.1:3100";
export default defineConfig({
  testDir: "./e2e", fullyParallel: false, workers: 1, timeout: 60000,
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PW_BASE_URL ? undefined : { command: "pnpm dev --hostname 127.0.0.1 --port 3100", env: { APP_ORIGIN: baseURL }, url: baseURL, reuseExistingServer: !process.env.CI, timeout: 120000 },
});
