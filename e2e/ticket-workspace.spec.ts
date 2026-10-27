import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test.use({ trace: "off", video: "off", reducedMotion: "reduce" });

test("ticket queue, private notes, routing and confirmed email keep their boundaries", async ({
  page,
}, testInfo) => {
  const file = process.env.UNIVOICE_LIVE_ADMIN_FILE;
  test.skip(
    !file,
    "An explicitly supplied local account is required for the authenticated shell; ticket APIs are intercepted.",
  );
  if (!file) return;
  const account = JSON.parse(readFileSync(file, "utf8")) as { email: string; password: string };
  await page.goto("/login");
  await page.locator("#login-email:visible").fill(account.email);
  await page.locator("#login-password:visible").fill(account.password);
  await page.locator('button[type="submit"]:visible').click();
  await expect(page).toHaveURL(/\/admin$/);
  const consent = page.getByRole("button", { name: "Только необходимые", exact: true });
  if (await consent.count()) await consent.click();
  const id = "11111111-1111-4111-8111-111111111111";
  const departmentId = "22222222-2222-4222-8222-222222222222";
  const staffId = "33333333-3333-4333-8333-333333333333";
  const ticket = {
    id,
    reference: "TEST-UI-ONLY",
    role: "student",
    category: "digital_services",
    description: "Изолированная проверка интерфейса: расписание не открывается в личном кабинете.",
    faculty: null,
    locale: "ru",
    aiConsent: false,
    createdAt: "2026-10-27T06:00:00.000Z",
    issueId: null,
    analysis: null,
    analysisStatus: "skipped",
    status: "new",
    priority: "medium",
    departmentId: null as string | null,
    assigneeId: null as string | null,
    updatedAt: "2026-10-27T06:00:00.000Z",
  };
  const messages: {
    id: string;
    kind: string;
    body: string;
    authorId: string;
    createdAt: string;
  }[] = [];
  const events = [
    {
      id: "event-1",
      action: "created",
      actorId: null,
      createdAt: ticket.createdAt,
      changes: { status: "new" },
    },
  ];
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  await page.route("**/api/admin/tickets**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== "GET") {
      const body = request.postDataJSON() as Record<string, unknown>;
      writes.push({ path, body });
      if (path.endsWith("/messages")) {
        messages.push({
          id: `message-${messages.length}`,
          kind: String(body.kind),
          body: String(body.body),
          authorId: staffId,
          createdAt: "2026-10-27T07:00:00.000Z",
        });
        ticket.updatedAt = new Date(Date.parse(ticket.updatedAt) + 1000).toISOString();
      }
      if (request.method() === "PATCH")
        Object.assign(ticket, body, { updatedAt: "2026-10-27T07:01:00.000Z" });
      return route.fulfill({ json: { ok: true } });
    }
    if (path.endsWith(`/${id}`)) return route.fulfill({ json: { ticket, messages, events } });
    return route.fulfill({
      json: {
        tickets: [ticket],
        departments: [
          {
            id: departmentId,
            name: "Тестовый отдел · только в браузере",
            email: "fixture@example.invalid",
            active: true,
          },
        ],
        staff: [{ id: staffId, email: "fixture@example.invalid", role: "admin" }],
      },
    });
  });
  await page.goto("/admin/issues");
  await expect(page.getByRole("heading", { name: "Обращения", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Поиск по номеру или тексту…" }).fill("не существует");
  await expect(page.getByRole("heading", { name: "Обращения не найдены" })).toBeVisible();
  await page.getByRole("button", { name: "Сбросить фильтры", exact: true }).last().click();
  await page.getByRole("textbox", { name: "Поиск по номеру или тексту…" }).fill("TEST-UI");
  await page.getByRole("button", { name: "Фильтры", exact: true }).click();
  await page.getByRole("combobox", { name: "Статус", exact: true }).selectOption("new");
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await page.getByRole("link", { name: "Открыть обращение: TEST-UI-ONLY", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/issues\\?ticket=${id}$`));
  await expect(page.getByRole("dialog", { name: "Карточка обращения" })).toBeVisible();
  await expect(page.locator('input[aria-label="Поиск по номеру или тексту…"]')).toHaveValue(
    "TEST-UI",
  );
  await page.getByRole("button", { name: "Закрыть обращение", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/issues$/);
  await expect(page.getByRole("textbox", { name: "Поиск по номеру или тексту…" })).toHaveValue(
    "TEST-UI",
  );
  await expect(
    page.getByRole("link", { name: "Открыть обращение: TEST-UI-ONLY", exact: true }),
  ).toBeFocused();
  await page.goForward();
  await expect(page.getByRole("dialog", { name: "Карточка обращения" })).toBeVisible();
  await page.locator("#ticket-message").fill("Несохранённый ответ");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.keyboard.press("Escape");
  await expect(page.locator("#ticket-message")).toHaveValue("Несохранённый ответ");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/admin/issues\\?ticket=${id}$`));
  await expect(page.locator("#ticket-message")).toHaveValue("Несохранённый ответ");
  await page.locator("#ticket-message").fill("");
  await page.getByRole("tab", { name: "Внутренняя заметка", exact: true }).click();
  await page.locator("#ticket-message").fill("Контекст для команды");
  await page.getByRole("tab", { name: "Ответить автору", exact: true }).click();
  await expect(page.locator("#ticket-message")).toHaveValue("");
  await page.locator("#ticket-message").fill("Мы проверяем доступ к расписанию.");
  await page.getByRole("button", { name: "Отправить ответ", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Ответ сохранён" })).toBeVisible();
  expect(writes[0].body).toEqual({ kind: "reply", body: "Мы проверяем доступ к расписанию." });
  await page.getByRole("tab", { name: "Внутренняя заметка", exact: true }).click();
  await expect(page.locator("#ticket-message")).toHaveValue("Контекст для команды");
  await expect(page.locator("#ticket-message-help")).toContainText("Автор обращения её не увидит");
  await page.locator("#ticket-department").selectOption(departmentId);
  await page.getByRole("button", { name: "Сохранить заметку", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Внутренняя заметка сохранена" }),
  ).toBeVisible();
  expect(writes[1].body).toEqual({ kind: "note", body: "Контекст для команды" });
  await expect(page.locator("#ticket-department")).toHaveValue(departmentId);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Закрыть обращение", exact: true }).click();
  await expect(page.locator("#ticket-department")).toHaveValue(departmentId);
  await page.locator("#ticket-status").selectOption("in_progress");
  await expect(
    page.getByRole("button", { name: "Уведомить по email", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  await expect(page.getByRole("button", { name: "Уведомить по email", exact: true })).toBeEnabled();
  expect(writes[2].body).toEqual({ status: "in_progress", departmentId });
  await page.getByRole("button", { name: "Уведомить по email", exact: true }).click();
  expect(writes.filter((item) => item.path.endsWith("/forward"))).toHaveLength(0);
  await expect(
    page.getByText("Текст обращения и личный код не отправляются.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Подтвердить отправку", exact: true }).click();
  await expect.poll(() => writes.filter((item) => item.path.endsWith("/forward")).length).toBe(1);
  const email = writes.find((item) => item.path.endsWith("/forward"))!;
  expect(Object.keys(email.body)).toEqual(["requestId"]);
  expect(email.body.requestId).toMatch(/^[0-9a-f-]{36}$/);
  await page.getByRole("tab", { name: /^История/ }).click();
  await expect(page.getByText("Обращение создано", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: /^Переписка/ }).click();
  await page.getByRole("button", { name: "Закрыть обращение", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Обращения не найдены" })).toBeVisible();
  await page.getByRole("button", { name: /^Фильтры/ }).click();
  await expect(page.getByRole("combobox", { name: "Статус", exact: true })).toHaveValue("new");
  await page.getByRole("combobox", { name: "Статус", exact: true }).selectOption("in_progress");
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Открыть обращение: TEST-UI-ONLY", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Открыть обращение: TEST-UI-ONLY", exact: true }).click();
  await expect(page.locator("#ticket-status")).toHaveValue("in_progress");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(390);
  await page.screenshot({
    path: testInfo.outputPath("ticket-mocked-mobile.png"),
    fullPage: true,
    mask: [page.getByText(account.email, { exact: true })],
  });
  await page.goto(`/admin/issues?tab=reports&report=${id}`);
  await expect(page.getByRole("dialog", { name: "Карточка обращения" })).toBeVisible();
  await page.getByRole("button", { name: "Закрыть обращение", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/issues\?tab=reports$/);
  await page.goto(`/admin/tickets/${id}`);
  await expect(page).toHaveURL(new RegExp(`/admin/issues\\?ticket=${id}$`));
  await expect(page.getByRole("dialog", { name: "Карточка обращения" })).toBeVisible();
});
