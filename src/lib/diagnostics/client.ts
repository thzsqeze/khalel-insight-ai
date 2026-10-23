"use client";

import type { BrowserOptions } from "@sentry/nextjs";
import { hasDiagnosticsConsent } from "@/lib/cookie-consent";
import { filterDiagnosticEvent } from "./privacy";
import { diagnosticDataCollection } from "./data-collection";

let sdkPromise: Promise<typeof import("@sentry/nextjs") | null> | undefined;
export function diagnosticsAllowed() {
  try { return typeof document !== "undefined" && hasDiagnosticsConsent(document.cookie); }
  catch { return false; }
}

export async function startClientDiagnostics() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN || !diagnosticsAllowed()) return null;
  sdkPromise ??= import("@sentry/nextjs").then(Sentry => {
    if (!diagnosticsAllowed()) { sdkPromise = undefined; return null; }
    const options: BrowserOptions = {
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      defaultIntegrations: false,
      integrations: [Sentry.globalHandlersIntegration(), Sentry.browserApiErrorsIntegration(), Sentry.dedupeIntegration()],
      initialScope: { tags: { diagnostics_source: "browser" } },
      dataCollection: diagnosticDataCollection,
      sendClientReports: false,
      maxBreadcrumbs: 0,
      tracesSampler: () => 0,
      beforeSendTransaction: () => null,
      beforeSend: event => filterDiagnosticEvent(event, diagnosticsAllowed()),
      beforeSendLog: () => null,
      beforeSendMetric: () => null,
      // Check again at dispatch: a queued event must not survive consent withdrawal.
      transport: options => {
        const transport = Sentry.makeFetchTransport(options);
        return {
          send: envelope => diagnosticsAllowed() && envelope[1].every(item => item[0].type === "event")
            ? transport.send(envelope)
            : Promise.resolve({ statusCode: 200 }),
          flush: timeout => transport.flush(timeout),
        };
      },
    };
    Sentry.init(options);
    return Sentry;
  }).catch(() => { sdkPromise = undefined; return null; });
  return sdkPromise;
}

export async function captureClientError(error: unknown) {
  // Don't queue errors from before consent for later delivery.
  if (!diagnosticsAllowed()) return;
  const Sentry = await startClientDiagnostics();
  if (Sentry && diagnosticsAllowed()) Sentry.captureException(error, { tags: { diagnostics_source: "react" } });
}
