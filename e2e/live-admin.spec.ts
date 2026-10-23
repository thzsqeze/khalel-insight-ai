import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import ru from "../src/messages/admin-ru.json";
import kk from "../src/messages/admin-kk.json";

// Explicit opt-in: read a local ignored credentials file, never record auth traces.
test.use({ trace: "off", video: "off" });
test("real Supabase administrator opens the workspace in both languages", async ({ page }, testInfo) => {
  const file = process.env.UNIVOICE_LIVE_ADMIN_FILE;
  test.skip(!file, "Set UNIVOICE_LIVE_ADMIN_FILE for live Supabase verification.");
  if (!file) return;
  const account = JSON.parse(readFileSync(file, "utf8")) as { email: string; password: string; projectUrl: string };
  expect(account.projectUrl).toBe(process.env.NEXT_PUBLIC_SUPABASE_URL);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/login");
  await page.locator("#login-email").fill(account.email);
  await page.locator("#login-password").fill(account.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: ru.admin.hello, exact: true })).toBeVisible();
  const response = await page.request.get("/api/admin/overview");
  expect(response.status()).toBe(200);
  const snapshot = await response.json();
  if (snapshot.submissions.length === 0) {
    await expect(page.getByRole("heading", { name: ru.admin.onboardingTitle, exact: true })).toBeVisible();
  }
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath("univoice-admin-live-ru.png"), animations: "disabled" });
  await page.getByRole("button", { name: "ҚАЗ", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "kk");
  await expect(page.getByRole("heading", { name: kk.admin.hello, exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("univoice-admin-live-kk.png"), animations: "disabled" });
  for (const route of ["/admin/issues", "/admin/analytics"]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");
  await expect(page.locator("h1")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
});
