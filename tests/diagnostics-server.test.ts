import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/nextjs";
import type { ErrorEvent, NodeOptions } from "@sentry/nextjs";
import { z } from "zod";
import { filterDiagnosticEvent } from "@/lib/diagnostics/privacy";
import { diagnosticDataCollection } from "@/lib/diagnostics/data-collection";
import { onRequestError } from "@/instrumentation";
import { respond } from "@/lib/server/http";
import { ApiError } from "@/lib/server/errors";

const state = vi.hoisted(() => ({ cookie: "" }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ cookie: state.cookie }) }));
const events: ErrorEvent[] = [];
const privateText = "PRIVATE_REPORT_password_code_person@example.com";

beforeAll(() => {
  vi.stubEnv("SENTRY_DSN", "https://public@example.test/1");
  const options: NodeOptions = {
    dsn: process.env.SENTRY_DSN,
    defaultIntegrations: false,
    dataCollection: diagnosticDataCollection,
    sendClientReports: false,
    beforeSend: event => filterDiagnosticEvent(event, event.tags?.univoice_diagnostics === "granted"),
    transport: () => ({
      send: async envelope => {
        for (const [header, payload] of envelope[1]) {
          if (header.type === "event") events.push(payload as ErrorEvent);
        }
        return { statusCode: 200 };
      },
      flush: async () => true,
    }),
  };
  Sentry.init(options);
});
beforeEach(() => { events.length = 0; state.cookie = ""; });
afterAll(async () => { await Sentry.close(); vi.unstubAllEnvs(); });

const context = { routerKind: "App Router", routePath: "/api/feedback", routeType: "route", renderSource: undefined, revalidateReason: undefined } as const;
const request = (cookie: string) => ({ path: `/api/feedback?code=${privateText}`, method: "POST", headers: { cookie, authorization: privateText } });

describe("server diagnostics consent at the transport boundary", () => {
  it("does not send request errors without valid, unambiguous consent", async () => {
    for (const cookie of ["", "univoice_cookie_consent=v1.required", "univoice_cookie_consent=v0.diagnostics", "univoice_cookie_consent=v1.diagnostics; univoice_cookie_consent=v1.required"]) {
      await onRequestError(new Error(privateText), request(cookie), context);
    }
    await Sentry.flush(1000);
    expect(events).toHaveLength(0);
  });
  it("sends a sanitized request error only with consent", async () => {
    await onRequestError(new TypeError(privateText), request("univoice_cookie_consent=v1.diagnostics"), context);
    expect(events).toHaveLength(1);
    expect(events[0].tags).toEqual({ diagnostics_source: "server" });
    expect(JSON.stringify(events)).not.toContain(privateText);
    expect(events[0].request).toBeUndefined();
    expect(events[0].user).toEqual({ ip_address: "0.0.0.0" });
  });
  it("captures unexpected API failures while preserving their public response", async () => {
    state.cookie = "univoice_cookie_consent=v1.diagnostics";
    const response = await respond(async () => { throw new Error(privateText); });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "unavailable" });
    expect(events).toHaveLength(1);
    expect(events[0].tags).toEqual({ diagnostics_source: "api" });
    expect(JSON.stringify(events)).not.toContain(privateText);
  });
  it("does not capture validation, access errors or API errors after revocation", async () => {
    state.cookie = "univoice_cookie_consent=v1.diagnostics";
    await respond(async () => { throw new ApiError("unauthorized", 401); });
    await respond(async () => z.string().parse(123));
    state.cookie = "univoice_cookie_consent=v1.required";
    await respond(async () => { throw new Error(privateText); });
    await Sentry.flush(1000);
    expect(events).toHaveLength(0);
  });
  it("rejects duplicate or encoded API consent cookies before Next normalizes them", async () => {
    for (const cookie of ["univoice_cookie_consent=v1.required; univoice_cookie_consent=v1.diagnostics", "univoice_cookie_consent=v1%2Ediagnostics"]) {
      state.cookie = cookie;
      await respond(async () => { throw new Error(privateText); });
    }
    await Sentry.flush(1000);
    expect(events).toHaveLength(0);
  });
});
