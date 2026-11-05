import { expect, test as base, type Page, type Route } from "@playwright/test";
import ru from "../src/messages/public-ru.json";
import kk from "../src/messages/public-kk.json";

const original = "В учебных аудиториях не хватает розеток для ноутбуков.";
const draft = "Прошу добавить розетки для ноутбуков в учебных аудиториях.";
const suggestion = {
  draft,
  suggestedCategory: "infrastructure",
  questionIds: ["impact"],
  redacted: false,
};

// Intercept the final submission boundary too: a helper regression must never create a report.
const test = base.extend<{ reportWriteGuard: void }>({
  reportWriteGuard: [
    async ({ page }, use) => {
      const writes: string[] = [];
      await page.route(/\/api\/feedback(?:\?.*)?$/, async (route) => {
        writes.push(route.request().method());
        await route.fulfill({ status: 503, json: { error: "unavailable" } });
      });
      await use(undefined);
      expect(writes, "Draft assistance must not submit a report").toHaveLength(0);
    },
    { auto: true },
  ],
});

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "locale", value: "ru", url: baseURL! },
    { name: "univoice_cookie_consent", value: "v1.required", url: baseURL! },
  ]);
});

async function openDetails(page: Page, messages = ru) {
  await page.goto("/submit?category=other");
  await page
    .getByRole("radiogroup")
    .getByText(messages.commonPublic.roles.student, { exact: true })
    .click();
  await page.getByRole("button", { name: messages.commonPublic.next, exact: true }).click();
  await expect(page.locator("#description")).toBeVisible();
}

async function requestSuggestion(page: Page) {
  await page.locator("#description").fill(original);
  await page.locator("#draft-assistant-consent").check();
  await page.locator("#draft-assistant-request").click();
}

test("assistance needs its own consent and sufficient text without granting final analysis consent", async ({
  page,
}) => {
  const requests: Record<string, unknown>[] = [];
  await page.route("**/api/feedback/assist", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ json: suggestion });
  });
  await openDetails(page);
  const consent = page.locator("#draft-assistant-consent");
  const request = page.locator("#draft-assistant-request");
  await expect(consent).not.toBeChecked();
  await expect(request).toBeDisabled();
  await page.locator("#description").fill(original);
  await expect(request).toBeDisabled();
  expect(requests).toHaveLength(0);

  await page.locator("#description").fill("Короткий текст");
  await consent.check();
  await expect(request).toBeDisabled();
  await page.locator("#description").fill(original);
  await expect(request).toBeEnabled();
  expect(requests).toHaveLength(0);
  await request.click();
  await expect(page.locator("#draft-assistant-result")).toContainText(draft);
  expect(requests).toEqual([
    {
      description: original,
      locale: "ru",
      assistantConsent: true,
      website: "",
      startedAt: expect.any(Number),
    },
  ]);
  await expect(page.locator("#description")).toHaveValue(original);
  await page.getByRole("button", { name: ru.commonPublic.next, exact: true }).click();
  await expect(page.locator("#consent")).not.toBeChecked();
  await expect(page.locator("#aiConsent")).not.toBeChecked();
  await expect(page.locator("#receipt-code")).toHaveCount(0);
});

test("draft and category suggestions apply independently and unchanged applied text can be undone", async ({
  page,
}) => {
  await page.route("**/api/feedback/assist", (route) => route.fulfill({ json: suggestion }));
  await openDetails(page);
  await requestSuggestion(page);
  await expect(page.locator("#draft-assistant-result")).toContainText(draft);
  await expect(page.locator("#description")).toHaveValue(original);
  await expect(page.locator("#category")).toHaveValue("other");

  await page.locator("#draft-assistant-category").click();
  await expect(page.locator("#category")).toHaveValue("infrastructure");
  await expect(page.locator("#description")).toHaveValue(original);
  await page.locator("#draft-assistant-apply").click();
  await expect(page.locator("#description")).toHaveValue(draft);
  await page.locator("#draft-assistant-undo").click();
  await expect(page.locator("#description")).toHaveValue(original);
  await expect(page.locator("#category")).toHaveValue("infrastructure");
});

test("undo cannot overwrite edits made after applying a suggestion", async ({ page }) => {
  await page.route("**/api/feedback/assist", (route) => route.fulfill({ json: suggestion }));
  await openDetails(page);
  await requestSuggestion(page);
  await page.locator("#draft-assistant-apply").click();
  await expect(page.locator("#description")).toHaveValue(draft);
  const edited = `${draft} Это мешает работе на занятиях.`;
  await page.locator("#description").fill(edited);
  await expect(page.locator("#draft-assistant-undo:enabled")).toHaveCount(0);
  await expect(page.locator("#description")).toHaveValue(edited);
});

test("restoring the original text after cancellation allows a fresh request", async ({ page }) => {
  let receiveFirstRequest!: (route: Route) => void;
  const firstRequest = new Promise<Route>((resolve) => {
    receiveFirstRequest = resolve;
  });
  const retryDraft = "Прошу установить дополнительные розетки для работы с ноутбуками на занятиях.";
  let requestCount = 0;
  await page.route("**/api/feedback/assist", async (route) => {
    requestCount += 1;
    if (requestCount === 1) receiveFirstRequest(route);
    else await route.fulfill({ json: { ...suggestion, draft: retryDraft } });
  });
  await openDetails(page);
  await requestSuggestion(page);
  const oldRequest = await firstRequest;
  await page.locator("#description").fill(`${original} Это мешает учебной работе.`);
  await page.locator("#description").fill(original);
  await expect(page.locator("#draft-assistant-request")).toBeEnabled();
  await page.locator("#draft-assistant-request").click();
  await expect(page.locator("#draft-assistant-result")).toContainText(retryDraft);
  expect(requestCount).toBe(2);
  await oldRequest.fulfill({ json: suggestion });
  await page.waitForLoadState("networkidle");
  await expect(page.locator("#draft-assistant-result")).toContainText(retryDraft);
  await page.locator("#draft-assistant-apply").click();
  await expect(page.locator("#description")).toHaveValue(retryDraft);
});

for (const invalidation of ["edited text", "revoked consent"] as const) {
  test(`a late response cannot restore a suggestion after ${invalidation}`, async ({ page }) => {
    let receiveRequest!: (route: Route) => void;
    const pendingRequest = new Promise<Route>((resolve) => {
      receiveRequest = resolve;
    });
    await page.route("**/api/feedback/assist", (route) => receiveRequest(route));
    await openDetails(page);
    await requestSuggestion(page);
    const route = await pendingRequest;
    const edited = `${original} Это мешает учебной работе.`;
    if (invalidation === "edited text") await page.locator("#description").fill(edited);
    else await page.locator("#draft-assistant-consent").uncheck();

    await route.fulfill({ json: suggestion });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#draft-assistant-result")).toHaveCount(0);
    await expect(page.locator("#description")).toHaveValue(
      invalidation === "edited text" ? edited : original,
    );
    await expect(page.locator("#category")).toHaveValue("other");
    if (invalidation === "revoked consent") {
      await expect(page.locator("#draft-assistant-request")).toBeDisabled();
      await page.locator("#draft-assistant-consent").check();
      await expect(page.locator("#draft-assistant-result")).toHaveCount(0);
    }
  });
}

test("provider failure preserves the manual draft and allows continuing without AI", async ({
  page,
}) => {
  await page.route("**/api/feedback/assist", (route) =>
    route.fulfill({ status: 503, json: { error: "unavailable" } }),
  );
  await openDetails(page);
  await requestSuggestion(page);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("#draft-assistant-result")).toHaveCount(0);
  await expect(page.locator("#description")).toHaveValue(original);
  await page.getByRole("button", { name: ru.commonPublic.next, exact: true }).click();
  await expect(page.locator("#aiConsent")).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: ru.submit.submitButton, exact: true }),
  ).toBeVisible();
  await expect(page.locator("#receipt-code")).toHaveCount(0);
});

test("Kazakh suggestions remain usable on a 320px screen", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  await context.addCookies([{ name: "locale", value: "kk", url: baseURL! }]);
  await page.setViewportSize({ width: 320, height: 844 });
  const kazakhDraft = "Оқу аудиторияларында ноутбуктерге арналған розеткаларды көбейтуді сұраймын.";
  const requests: Record<string, unknown>[] = [];
  await page.route("**/api/feedback/assist", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ json: { ...suggestion, draft: kazakhDraft } });
  });
  await openDetails(page, kk);
  await expect(page.locator("html")).toHaveAttribute("lang", "kk");
  await page
    .locator("#description")
    .fill("Оқу аудиторияларында ноутбуктерге арналған розеткалар аз.");
  await page.locator("#draft-assistant-consent").check();
  await page.locator("#draft-assistant-request").click();
  await expect(page.locator("#draft-assistant-result")).toContainText(kazakhDraft);
  expect(requests).toHaveLength(1);
  expect(requests[0].locale).toBe("kk");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.locator("#draft-assistant-apply").click();
  await expect(page.locator("#description")).toHaveValue(kazakhDraft);
  await page.screenshot({
    path: testInfo.outputPath("draft-assistant-kk-mobile.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: kk.commonPublic.next, exact: true }).click();
  await expect(page.locator("#aiConsent")).not.toBeChecked();
});
