import * as Sentry from "@sentry/nextjs";
import { filterDiagnosticEvent } from "./privacy";
import { diagnosticDataCollection } from "./data-collection";

export function initializeServerDiagnostics() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    defaultIntegrations: false,
    dataCollection: diagnosticDataCollection,
    includeServerName: false,
    enableOpenTelemetrySetup: false,
    tracesSampler: () => 0,
    beforeSendTransaction: () => null,
    sendClientReports: false,
    maxBreadcrumbs: 0,
    beforeSend: event => filterDiagnosticEvent(event, event.tags?.univoice_diagnostics === "granted"),
    beforeSendLog: () => null,
    beforeSendMetric: () => null,
  });
}
