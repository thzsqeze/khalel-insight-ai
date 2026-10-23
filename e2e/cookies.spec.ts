import { expect, test } from "@playwright/test";
import ru from "../src/messages/admin-ru.json";
import kk from "../src/messages/admin-kk.json";

const consentName = "univoice_cookie_consent";

test("required-only choice persists and preserves language and session cookies", async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: "locale", value: "kk", url: baseURL!, sameSite: "Lax" },
    { name: "sb-cookie-test-auth-token", value: "untouched-session", url: baseURL!, httpOnly: true, sameSite: "Lax" },
  ]);
  await page.goto("/");
  const banner = page.getByRole("region", { name: kk.cookies.title, exact: true });
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: kk.cookies.requiredOnly, exact: true }).click();
  await expect(banner).toHaveCount(0);
  await page.reload();
  await expect(banner).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("lang", "kk");
  const cookies = await context.cookies();
  expect(cookies.find(cookie => cookie.name === "locale")?.value).toBe("kk");
  expect(cookies.find(cookie => cookie.name === "sb-cookie-test-auth-token")?.value).toBe("untouched-session");
  const consent = cookies.find(cookie => cookie.name === consentName)!;
  expect(consent.value).toBe("v1.required");
  expect(consent.path).toBe("/");
  expect(consent.sameSite).toBe("Lax");
  expect(consent.httpOnly).toBe(false);
  expect(consent.expires - Date.now() / 1000).toBeGreaterThan(179 * 86400);
  expect(consent.expires - Date.now() / 1000).toBeLessThanOrEqual(180 * 86400);
});

test("diagnostics can be accepted, reopened and revoked without resetting necessary cookies", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "sb-cookie-test-auth-token", value: "untouched-session", url: baseURL!, httpOnly: true }]);
  await page.goto("/");
  await page.getByRole("button", { name: ru.cookies.allowDiagnostics, exact: true }).click();
  await expect(page.getByRole("region", { name: ru.cookies.title, exact: true })).toHaveCount(0);
  expect((await context.cookies()).find(cookie => cookie.name === consentName)?.value).toBe("v1.diagnostics");
  await page.reload();
  await expect(page.getByRole("region", { name: ru.cookies.title, exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "ҚАЗ", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "kk");
  await page.getByRole("button", { name: kk.cookies.settings, exact: true }).click();
  const settings = page.getByRole("region", { name: kk.cookies.title, exact: true });
  await expect(settings).toBeVisible();
  await expect(settings.getByText(kk.cookies.statusDiagnostics, { exact: true })).toBeVisible();
  await settings.getByRole("button", { name: kk.cookies.requiredOnly, exact: true }).click();
  await expect(settings).toHaveCount(0);
  const cookies = await context.cookies();
  expect(cookies.find(cookie => cookie.name === consentName)?.value).toBe("v1.required");
  expect(cookies.find(cookie => cookie.name === "locale")?.value).toBe("kk");
  expect(cookies.find(cookie => cookie.name === "sb-cookie-test-auth-token")?.value).toBe("untouched-session");
  await page.reload();
  await expect(settings).toHaveCount(0);
});

test("unsupported consent version asks again without blocking mobile navigation", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: consentName, value: "v0.diagnostics", url: baseURL! }]);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  const banner = page.getByRole("region", { name: ru.cookies.title, exact: true });
  await expect(banner).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Открыть меню", exact: true }).click();
  await expect(page.locator("#public-mobile-nav")).toBeVisible();
  await page.locator('#public-mobile-nav a[href="/track"]').click();
  await expect(page).toHaveURL(/\/track$/);
  await expect(banner).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("failed cookie persistence keeps the choice visible with an actionable error", async ({ page }) => {
  await page.addInitScript(() => {
    const original = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")!;
    Object.defineProperty(document, "cookie", { configurable: true, get: () => original.get!.call(document), set: () => {} });
  });
  await page.goto("/");
  const banner = page.getByRole("region", { name: ru.cookies.title, exact: true });
  await banner.getByRole("button", { name: ru.cookies.allowDiagnostics, exact: true }).click();
  await expect(banner).toBeVisible();
  await expect(banner.getByRole("alert")).toHaveText(ru.cookies.saveError);
});

test("unreadable cookies show a clear error while the site remains available", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "cookie", { configurable: true, get: () => { throw new DOMException("Cookies unavailable", "SecurityError"); } });
  });
  await page.goto("/");
  const banner = page.getByRole("region", { name: ru.cookies.title, exact: true });
  await expect(banner.getByRole("alert")).toHaveText(ru.cookies.readError);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("a consent change in another tab is reflected when the page receives focus", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: ru.cookies.allowDiagnostics, exact: true }).click();
  await page.getByRole("button", { name: ru.cookies.settings, exact: true }).click();
  await expect(page.getByText(ru.cookies.statusDiagnostics, { exact: true })).toBeVisible();
  const other = await context.newPage();
  await other.goto("/");
  await other.getByRole("button", { name: ru.cookies.settings, exact: true }).click();
  await other.getByRole("button", { name: ru.cookies.requiredOnly, exact: true }).click();
  await page.bringToFront();
  await expect(page.getByText(ru.cookies.statusRequired, { exact: true })).toBeVisible();
});
