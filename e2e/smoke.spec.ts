import { expect, test } from "@playwright/test";
import ru from "../src/messages/public-ru.json";
import kk from "../src/messages/public-kk.json";

test("Kazakh switch persists across public and admin navigation", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page).toHaveTitle(/UniVoice/);
  await expect(page.locator("footer")).toContainText("Демонстрационный университет");
  await expect(page.locator("h1")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath("univoice-home-ru.png"), animations: "disabled" });
  await page.getByRole("button", { name: "ҚАЗ", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "kk");
  await expect(page.locator("footer")).toContainText("Демонстрациялық университет");
  await expect(page.locator("h1")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("univoice-home-kk.png"), animations: "disabled" });
  await page.goto("/submit");
  await expect(page.getByRole("heading", { name: kk.submit.title, exact: true })).toBeVisible();
  await page.goto("/login");
  await page.getByRole("button", { name: "Демо кабинетке кіру", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Өтініштерге шолу" })).toBeVisible();
  await expect(page.locator("aside")).toContainText("Демонстрациялық университет");
  await page.screenshot({ path: testInfo.outputPath("univoice-admin-kk.png"), animations: "disabled" });
  await page.getByRole("button", { name: "РУС", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByRole("heading", { name: "Обзор обращений" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("univoice-admin-ru.png"), animations: "disabled" });
});

test("private endpoints reject guests and cross-origin mutations", async ({ page, request, baseURL }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
  expect((await request.get("/api/admin/overview")).status()).toBe(401);
  expect((await request.post("/api/auth/login", { headers: { Origin: "https://attacker.example" }, data: { demo: true } })).status()).toBe(403);
  expect((await request.post("/api/locale", { headers: { Origin: baseURL! }, data: { locale: "en" } })).status()).toBe(400);
});

test("anonymous report receives private code and follows admin status changes", async ({ page, baseURL }) => {
  const started = Date.now();
  await page.goto("/submit");
  await page.getByText(ru.commonPublic.roles.student, { exact: true }).click();
  await page.getByRole("button", { name: ru.commonPublic.next, exact: true }).click();
  await page.locator("#category").selectOption("infrastructure");
  await page.locator("#description").fill("В аудитории не работает отопление. Просим проверить систему перед занятиями.");
  await page.getByRole("button", { name: ru.commonPublic.next, exact: true }).click();
  await page.locator("#consent").check();
  await expect.poll(() => Date.now() - started).toBeGreaterThan(2100);
  await page.getByRole("button", { name: ru.submit.submitButton, exact: true }).click();
  await expect(page.locator("#receipt-code")).toBeVisible();
  const code = await page.locator("#receipt-code").inputValue();
  expect(code.length).toBeGreaterThanOrEqual(32);
  const headers = { Origin: baseURL! };
  const trackedResponse = await page.request.post("/api/track", { headers, data: { code } });
  expect(trackedResponse.ok()).toBeTruthy();
  const tracked = await trackedResponse.json();
  expect(tracked.status).toBe("new");
  expect(tracked).not.toHaveProperty("description");
  await page.goto("/login");
  await page.getByRole("button", { name: "Войти в демо-кабинет", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  const snapshot = await (await page.request.get("/api/admin/overview")).json();
  const report = snapshot.submissions.find((item: { reference: string }) => item.reference === tracked.reference);
  expect(report.analysisStatus).toBe("skipped");
  const created = await page.request.post("/api/admin/issues", { headers, data: { submissionId: report.id, title: "Отопление в учебной аудитории", category: "infrastructure" } });
  expect(created.ok()).toBeTruthy();
  const { id } = await created.json();
  await page.goto(`/admin/issues/${id}`);
  await page.locator("#issue-status").selectOption("in_progress");
  await page.locator("#issue-owner").fill("Хозяйственная служба");
  await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Изменения сохранены");
  const updated = await (await page.request.post("/api/track", { headers, data: { code } })).json();
  expect(updated.status).toBe("in_progress");
  await expect(page.getByText("Работа над проблемой начата", { exact: true })).toBeVisible();
});

test("mobile public screens fit and remain navigable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/", "/submit", "/track", "/issues", "/privacy", "/login"]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  }
  await page.getByRole("button", { name: "Открыть меню", exact: true }).click();
  await expect(page.locator("#public-mobile-nav")).toBeVisible();
});

test("dashboard review queue opens the selected report with its period", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Войти в демо-кабинет", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  const reportLink = page.locator('a[href*="tab=reports&days="][href*="&report="]').first();
  await expect(reportLink).toBeVisible();
  const href = await reportLink.getAttribute("href");
  const destination = new URL(href!, "http://localhost");
  const reportId = destination.searchParams.get("report");
  await reportLink.click();
  await expect(page).toHaveURL(/tab=reports.*report=/);
  await expect(page.locator(`#report-${reportId}`)).toBeVisible();
});
