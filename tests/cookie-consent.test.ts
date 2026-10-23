import { describe, expect, it } from "vitest";
import { hasDiagnosticsConsent, parseCookieConsent, readCookieConsent } from "@/lib/cookie-consent";

describe("cookie consent", () => {
  it.each([
    ["v1.required", "required"],
    ["v1.diagnostics", "diagnostics"],
    [undefined, null],
    [null, null],
    ["", null],
    ["diagnostics", null],
    ["v2.diagnostics", null],
    ["v1.DIAGNOSTICS", null],
    [" v1.diagnostics", null],
    ["v1.diagnostics ", null],
    ["v1%2Ediagnostics", null],
  ])("recognizes only an explicit supported choice: %s", (value, expected) => {
    expect(parseCookieConsent(value)).toBe(expected);
  });

  it("finds consent among unrelated session and locale cookies", () => {
    expect(readCookieConsent("locale=kk; univoice_cookie_consent=v1.required; sb-project-auth-token=session=value")).toBe("required");
    expect(readCookieConsent("locale=ru; univoice_cookie_consent=v1.diagnostics")).toBe("diagnostics");
  });

  it.each([
    "",
    "locale=kk",
    "other_univoice_cookie_consent=v1.diagnostics",
    "univoice_cookie_consent=",
    "univoice_cookie_consent=v1.required",
    "univoice_cookie_consent=v2.diagnostics",
    "univoice_cookie_consent=%E0%A4%A",
    "univoice_cookie_consent=v1.diagnostics=extra",
    "univoice_cookie_consent=v1.required; univoice_cookie_consent=v1.diagnostics",
    "univoice_cookie_consent=v1.diagnostics; univoice_cookie_consent=v1.required",
  ])("keeps diagnostics disabled for missing, rejected, malformed or ambiguous consent: %s", header => {
    expect(hasDiagnosticsConsent(header)).toBe(false);
  });

  it("enables diagnostics only for the exact consent cookie", () => {
    expect(hasDiagnosticsConsent("locale=kk; univoice_cookie_consent=v1.diagnostics; session=abc")).toBe(true);
  });
});
