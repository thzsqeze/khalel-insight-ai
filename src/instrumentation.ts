import type { Instrumentation } from "next";
import { hasDiagnosticsConsent } from "@/lib/cookie-consent";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    const { initializeServerDiagnostics } = await import("@/lib/diagnostics/server-config");
    initializeServerDiagnostics();
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request) => {
  const cookie = request.headers.cookie;
  if (!hasDiagnosticsConsent(typeof cookie === "string" ? cookie : "")) return;
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    // Do not forward Next's request/context objects; they can contain private data.
    Sentry.captureException(error, { tags: { univoice_diagnostics: "granted", diagnostics_source: "server" } });
    await Sentry.flush(1500);
  } catch { /* A monitoring outage must not affect the application. */ }
};
