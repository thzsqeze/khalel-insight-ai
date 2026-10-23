export const COOKIE_CONSENT_NAME = "univoice_cookie_consent";
export const COOKIE_CONSENT_EVENT = "univoice:cookie-consent-changed";
export type CookieConsent = "required" | "diagnostics";

export function parseCookieConsent(value: string | undefined | null): CookieConsent | null {
  if (value === "v1.required") return "required";
  if (value === "v1.diagnostics") return "diagnostics";
  return null;
}

export function readCookieConsent(cookieHeader: string): CookieConsent | null {
  const matches = cookieHeader.split(";").filter(cookie => cookie.slice(0, cookie.indexOf("=")).trim() === COOKIE_CONSENT_NAME);
  // Conflicting path/domain cookies must never grant optional diagnostics.
  if (matches.length !== 1) return null;
  const cookie = matches[0];
  return parseCookieConsent(cookie.slice(cookie.indexOf("=") + 1));
}

export function hasDiagnosticsConsent(cookieHeader: string): boolean {
  return readCookieConsent(cookieHeader) === "diagnostics";
}
