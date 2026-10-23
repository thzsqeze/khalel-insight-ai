import "server-only";
import { headers } from "next/headers";
import { hasDiagnosticsConsent } from "@/lib/cookie-consent";

export async function captureServerError(error: unknown) {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  try {
    const requestHeaders = await headers();
    if (!hasDiagnosticsConsent(requestHeaders.get("cookie") ?? "")) return;
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(error, { tags: { univoice_diagnostics: "granted", diagnostics_source: "api" } });
    await Sentry.flush(1500);
  } catch {
    // Monitoring must never change a request's result or expose a second failure.
  }
}
