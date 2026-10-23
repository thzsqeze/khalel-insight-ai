import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { filterDiagnosticEvent } from "@/lib/diagnostics/privacy";

const privateText = "PRIVATE_REPORT_password_trackingCode_person@example.com";
const event: ErrorEvent = {
  type: undefined,
  event_id: "b".repeat(32), timestamp: 1234, level: "error", platform: "javascript",
  message: privateText,
  user: { id: privateText, email: privateText, ip_address: "127.0.0.1" },
  request: { url: `https://site.test/track?code=${privateText}`, data: privateText, headers: { Authorization: privateText, Cookie: privateText } },
  breadcrumbs: [{ message: privateText, data: { text: privateText } }],
  extra: { description: privateText }, contexts: { custom: { value: privateText } },
  tags: { diagnostics_source: "api", arbitrary: privateText, univoice_diagnostics: "granted" },
  transaction: privateText, fingerprint: [privateText],
  exception: { values: [{ type: "TypeError", value: privateText, mechanism: { type: "generic", data: { secret: privateText } }, stacktrace: { frames: [
    { filename: `https://site.test/_next/static/chunks/app.js?code=${privateText}`, function: privateText, lineno: 41, colno: 8, vars: { form: privateText }, context_line: privateText },
    { filename: `https://site.test/track/${privateText}`, function: privateText, lineno: 1 },
  ] } }] },
};

describe("diagnostic event privacy", () => {
  it("drops all events when diagnostics consent is absent or revoked", () => {
    expect(filterDiagnosticEvent(event, false)).toBeNull();
  });
  it("keeps technical stack locations but removes request, identity and arbitrary content", () => {
    const result = filterDiagnosticEvent(event, true)!;
    expect(result.event_id).toBe("b".repeat(32));
    expect(result.exception?.values?.[0]?.type).toBe("TypeError");
    expect(result.exception?.values?.[0]?.stacktrace?.frames).toEqual([{ filename: "/_next/static/chunks/app.js", lineno: 41, colno: 8 }]);
    expect(result.tags).toEqual({ diagnostics_source: "api" });
    expect(JSON.stringify(result)).not.toContain(privateText);
    expect(result.user).toEqual({ ip_address: "0.0.0.0" });
    for (const field of ["request", "breadcrumbs", "extra", "contexts", "transaction", "fingerprint", "message"]) expect(result).not.toHaveProperty(field);
    expect(event.message).toBe(privateText);
  });
  it("does not send custom exception types, mechanisms or arbitrary source paths", () => {
    const result = filterDiagnosticEvent({ type: undefined, exception: { values: [{ type: privateText, value: privateText, mechanism: { type: privateText }, stacktrace: { frames: [{ filename: `/Users/private/${privateText}.js`, lineno: 3 }] } }] } }, true)!;
    expect(result.exception?.values?.[0]?.type).toBe("Error");
    expect(result.exception?.values?.[0]?.stacktrace).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain(privateText);
  });
  it("drops message-only events to avoid collecting freeform text", () => {
    expect(filterDiagnosticEvent({ type: undefined, message: privateText }, true)).toBeNull();
  });
  it("retains validated source-map IDs only for sanitized stack files", () => {
    const result = filterDiagnosticEvent({ ...event, release: "a".repeat(40), debug_meta: { images: [
      { type: "sourcemap", debug_id: "12345678-abcd-1234-abcd-123456789012", code_file: `https://site.test/_next/static/chunks/app.js?private=${privateText}` },
      { type: "sourcemap", debug_id: privateText, code_file: "/_next/static/chunks/app.js" },
      { type: "sourcemap", debug_id: "12345678-abcd-1234-abcd-123456789012", code_file: `/Users/${privateText}.js` },
    ] } }, true)!;
    expect(result.debug_meta?.images).toEqual([{ type: "sourcemap", debug_id: "12345678-abcd-1234-abcd-123456789012", code_file: "/_next/static/chunks/app.js" }]);
    expect(result.release).toBe("a".repeat(40));
    expect(JSON.stringify(result)).not.toContain(privateText);
    expect(filterDiagnosticEvent({ ...event, release: privateText }, true)?.release).toBeUndefined();
  });
});
