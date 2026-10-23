import { expect, test } from "@playwright/test";
import ru from "../src/messages/admin-ru.json";

test("Sentry sends only sanitized errors after consent and stops after revocation", async ({ page }) => {
  test.skip(!process.env.NEXT_PUBLIC_SENTRY_DSN, "Set a Sentry DSN to exercise the browser SDK");
  const sent: string[] = [];
  // Intercept the external boundary: synthetic private test values never leave the machine.
  await page.route("**/*sentry.io/**", async route => {
    if (route.request().method() === "POST") sent.push(route.request().postData() ?? "");
    await route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: "{}" });
  });
  const trigger = (message: string) => page.evaluate(message => {
    setTimeout(() => { throw new Error(message); }, 0);
  }, message);

  await page.goto("/");
  await trigger("PRIVATE_REPORT_before_consent");
  await page.getByRole("button", { name: ru.cookies.requiredOnly, exact: true }).click();
  await trigger("PRIVATE_REPORT_required_only");
  await page.waitForTimeout(600);
  expect(sent).toHaveLength(0);

  await page.getByRole("button", { name: ru.cookies.settings, exact: true }).click();
  await page.getByRole("button", { name: ru.cookies.allowDiagnostics, exact: true }).click();
  // Consent starts a lazy import; an already-idle page doesn't mean the SDK is ready.
  await page.waitForFunction(() => typeof window.onerror === "function" && "__SENTRY_INSTRUMENTED__" in window.onerror);
  const privateText = "PRIVATE_REPORT_password_code_person@example.com";
  await trigger(privateText);
  await expect.poll(() => sent.length, { timeout: 15000 }).toBe(1);
  expect(sent[0]).not.toContain(privateText);
  const lines = sent[0].split("\n");
  expect(JSON.parse(lines[1]).type).toBe("event");
  const event = JSON.parse(lines[2]);
  expect(event.exception.values[0].value).toBe("UniVoice application error (private details removed)");
  expect(event.user).toEqual({ ip_address: "0.0.0.0" });
  for (const field of ["request", "breadcrumbs", "extra", "contexts", "transaction", "message"]) expect(event).not.toHaveProperty(field);
  expect(event.tags.diagnostics_source).toBe("browser");

  await page.getByRole("button", { name: ru.cookies.settings, exact: true }).click();
  await page.getByRole("button", { name: ru.cookies.close, exact: true }).click();
  await expect(page.getByRole("region", { name: ru.cookies.title, exact: true })).toHaveCount(0);
  await trigger("PRIVATE_REPORT_after_revocation");
  await page.waitForTimeout(600);
  expect(sent).toHaveLength(1);
  await page.reload();
  await trigger("PRIVATE_REPORT_after_reload");
  await page.waitForTimeout(600);
  expect(sent).toHaveLength(1);
});
