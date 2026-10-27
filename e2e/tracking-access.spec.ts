import { expect, test } from "@playwright/test";
import ru from "../src/messages/public-ru.json";
import kk from "../src/messages/public-kk.json";

test("a reference shows status while only a personal code opens the conversation", async ({
  page,
}) => {
  const reference = "UV-1234567890";
  const personalCode = "A".repeat(32);
  await page.route("**/api/track", async (route) => {
    const { code } = route.request().postDataJSON() as { code: string };
    if (code === reference) {
      return route.fulfill({ json: { access: "status", reference, status: "in_progress" } });
    }
    if (code === personalCode) {
      return route.fulfill({
        json: {
          access: "conversation",
          reference,
          status: "in_progress",
          category: "other",
          createdAt: "2026-10-27T08:00:00.000Z",
          events: [{ status: "in_progress", createdAt: "2026-10-27T09:00:00.000Z" }],
          messages: [
            {
              id: "fixture-reply",
              kind: "reply",
              body: "Ответ по личному коду",
              createdAt: "2026-10-27T09:00:00.000Z",
            },
          ],
        },
      });
    }
    return route.fulfill({ status: 404, json: { error: "not_found" } });
  });
  await page.goto("/track");
  const input = page.getByLabel(ru.track.codeLabel, { exact: true });
  const submit = page.getByRole("button", { name: ru.track.button, exact: true });
  await input.fill(reference);
  await submit.click();
  await expect(page.getByRole("heading", { name: ru.track.statusOnlyTitle })).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toHaveText(/В работе/);
  await expect(page.locator("#tracking-follow-up")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: ru.track.history })).toHaveCount(0);
  await expect(page).toHaveURL(/\/track$/);
  await page.getByRole("button", { name: ru.track.openConversation }).click();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("");

  await input.fill(personalCode);
  await submit.click();
  await expect(page.getByText("Ответ по личному коду", { exact: true })).toBeVisible();
  await expect(page.locator("#tracking-follow-up")).toBeVisible();
  await expect(page).toHaveURL(/\/track$/);

  await input.fill(reference);
  await submit.click();
  await expect(page.getByRole("heading", { name: ru.track.statusOnlyTitle })).toBeVisible();
  await expect(page.getByText("Ответ по личному коду", { exact: true })).toHaveCount(0);
  await expect(page.locator("#tracking-follow-up")).toHaveCount(0);

  await input.fill("UV-0000000000");
  await submit.click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("heading", { name: ru.track.statusOnlyTitle })).toHaveCount(0);

  await page.getByRole("button", { name: "ҚАЗ", exact: true }).click();
  const kazakhInput = page.getByLabel(kk.track.codeLabel, { exact: true });
  await expect(kazakhInput).toBeVisible();
  await kazakhInput.fill(reference);
  await page.getByRole("button", { name: kk.track.button, exact: true }).click();
  await expect(page.getByRole("heading", { name: kk.track.statusOnlyTitle })).toBeVisible();
  await expect(page.locator("#tracking-follow-up")).toHaveCount(0);
});
