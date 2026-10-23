import { expect, test } from "@playwright/test";
import ru from "../src/messages/public-ru.json";
import kk from "../src/messages/public-kk.json";

test("Kazakh switch persists across public navigation and real login", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page).toHaveTitle(/UniVoice/);
  await expect(page.locator("h1")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath("univoice-home-ru.png"), animations: "disabled" });
  await page.getByRole("button", { name: "ҚАЗ", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "kk");
  await expect(page.locator("h1")).toContainText(kk.landing.titleFirst);
  await page.screenshot({ path: testInfo.outputPath("univoice-home-kk.png"), animations: "disabled" });
  await page.goto("/submit");
  await expect(page.getByRole("heading", { name: kk.submit.title, exact: true })).toBeVisible();
  await page.goto("/login");
  await expect(page.getByRole("button", { name: kk.login.button, exact: true })).toBeVisible();
  await expect(page.locator("#login-email")).toBeVisible();
  await expect(page.locator("#login-password")).toHaveAttribute("type", "password");
  await expect(page.getByRole("button", { name: /демо/i })).toHaveCount(0);
  await page.getByRole("button", { name: "РУС", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByRole("button", { name: ru.login.button, exact: true })).toBeVisible();
});

test("private endpoints reject guests, legacy demo login and cross-origin mutations", async ({ page, request, baseURL }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
  expect((await request.get("/api/admin/overview")).status()).toBe(401);
  expect((await request.post("/api/auth/login", { headers: { Origin: "https://attacker.example" }, data: { demo: true } })).status()).toBe(403);
  expect((await request.post("/api/auth/login", { headers: { Origin: baseURL! }, data: { demo: true } })).status()).toBe(400);
  expect((await request.post("/api/locale", { headers: { Origin: baseURL! }, data: { locale: "en" } })).status()).toBe(400);
});

test("a category link preselects only the topic, leaving role and consents explicit", async ({ page }) => {
  await page.goto("/");
  await page.locator('a[href="/submit?category=infrastructure"]').click();
  await expect(page).toHaveURL(/category=infrastructure/);
  await expect(page.locator('input[type="radio"]:checked')).toHaveCount(0);
  await page.getByRole("button", { name: ru.commonPublic.next, exact: true }).click();
  await expect(page.locator("#role-error")).toBeVisible();
  await page.getByText(ru.commonPublic.roles.student, { exact: true }).click();
  await page.getByRole("button", { name: ru.commonPublic.next, exact: true }).click();
  await expect(page.locator("#category")).toHaveValue("infrastructure");
  await page.locator("#description").fill("Проверка формы: текст не отправляется и не сохраняется в базе данных.");
  await page.getByRole("button", { name: ru.commonPublic.next, exact: true }).click();
  await expect(page.locator("#consent")).not.toBeChecked();
  await expect(page.locator("#aiConsent")).not.toBeChecked();
  await page.getByRole("button", { name: ru.submit.submitButton, exact: true }).click();
  await expect(page.locator("#consent-error")).toBeVisible();
  await expect(page.locator("#receipt-code")).toHaveCount(0);
});

test("invalid category URLs cannot inject a topic", async ({ page }) => {
  await page.goto("/submit?category=unknown");
  await page.getByText(ru.commonPublic.roles.student, { exact: true }).click();
  await page.getByRole("button", { name: ru.commonPublic.next, exact: true }).click();
  await expect(page.locator("#category")).toHaveValue("");
});

test("mobile public screens fit and remain navigable", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/", "/submit", "/track", "/issues", "/privacy", "/login"]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
    if (route === "/") {
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: testInfo.outputPath("univoice-mobile.png"), animations: "disabled" });
    }
  }
  await page.getByRole("button", { name: "Открыть меню", exact: true }).click();
  await expect(page.locator("#public-mobile-nav")).toBeVisible();
});
