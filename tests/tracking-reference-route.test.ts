import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as track } from "@/app/api/track/route";
import { POST as followUp } from "@/app/api/track/messages/route";

const diagnostics = vi.hoisted(() => ({ captureServerError: vi.fn() }));
vi.mock("@/lib/server/diagnostics", () => diagnostics);

const reference = "UV-EDBAC236B5";
const id = "20000000-0000-4000-8000-000000000001";
const calls: { method: string; url: URL; body: unknown }[] = [];
let submission: Record<string, unknown> | null;
let ticket: Record<string, unknown> | null;
let conversation: Record<string, unknown> | null;
let allowed: boolean;
let databaseError: boolean;

function request(code: string, path = "/api/track", origin = "http://localhost:3000") {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { origin, host: "localhost:3000", "content-type": "application/json" },
    body: JSON.stringify(path.endsWith("messages") ? { code, body: "Follow-up" } : { code }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  allowed = true;
  databaseError = false;
  submission = { id, reference, description: "Private report", tracking_hash: "secret hash" };
  ticket = {
    id,
    status: "under_review",
    category: "education",
    messages: [{ body: "Private reply" }],
    events: [{ actor: "Staff member" }],
  };
  conversation = null;
  vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    calls.push({ method: req.method, url, body: req.method === "POST" ? await req.json() : null });
    const table = url.pathname.split("/").at(-1);
    let data: unknown;
    if (table === "consume_rate_limit") data = allowed;
    else if (table === "submissions") data = submission ? [submission] : [];
    else if (table === "tickets") data = ticket ? [ticket] : [];
    else if (table === "track_ticket_submission") data = conversation;
    else throw new Error(`Unexpected database access: ${url.pathname}`);
    if (databaseError && table !== "consume_rate_limit") {
      return new Response(JSON.stringify({ message: "Private database detail", code: "XX000" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("tracking by public reference", () => {
  it("normalizes a complete public reference and exposes only its reference and status", async () => {
    const response = await track(request("  uv-edbac236b5  "));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ access: "status", reference, status: "under_review" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(calls.map(({ url }) => url.pathname)).toEqual([
      "/rest/v1/rpc/consume_rate_limit",
      "/rest/v1/submissions",
      "/rest/v1/tickets",
    ]);
    expect(calls[1].url.searchParams.get("select")).toBe("id,reference");
    expect(calls[1].url.searchParams.get("reference")).toBe("eq.UV-EDBAC236B5");
    expect(calls[2].url.searchParams.get("select")).toBe("status");
    expect(calls[2].url.searchParams.get("id")).toBe(`eq.${id}`);
  });

  it.each(["submission", "ticket"])("returns a generic 404 for a missing %s", async (missing) => {
    if (missing === "submission") submission = null;
    else ticket = null;
    const response = await track(request(reference));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
    expect(calls.some(({ url }) => url.pathname.endsWith("track_ticket_submission"))).toBe(false);
  });

  it("preserves hashed private-code lookup and the private conversation response", async () => {
    conversation = {
      reference,
      category: "education",
      status: "under_review",
      createdAt: "2026-10-27T10:00:00Z",
      events: [],
      messages: [
        {
          id: "message-id",
          kind: "reply",
          body: "Private reply",
          createdAt: "2026-10-27T11:00:00Z",
        },
      ],
    };
    const response = await track(request("x".repeat(32)));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ...conversation, access: "conversation" });
    expect(calls.map(({ url }) => url.pathname)).toEqual([
      "/rest/v1/rpc/consume_rate_limit",
      "/rest/v1/rpc/track_ticket_submission",
    ]);
    expect(calls[1].body).toEqual({
      p_hash: "c62e4615bd39e222572f3a1bf7c2132ea1e65b17ec805047bd6b2842c593493f",
    });
    expect(JSON.stringify(calls)).not.toContain("x".repeat(32));
  });

  it.each(["UV-EDBAC", "UV-EDBAC236BG", "UV-%", "invalid"])(
    "does not perform partial or malformed reference searches for %s",
    async (code) => {
      const response = await track(request(code));
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "not_found" });
      expect(
        calls.some(({ url }) =>
          ["/rest/v1/submissions", "/rest/v1/tickets"].includes(url.pathname),
        ),
      ).toBe(false);
    },
  );

  it("rejects a public reference as a follow-up credential before any message write", async () => {
    const response = await followUp(request(reference, "/api/track/messages"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_input" });
    expect(calls.map(({ url }) => url.pathname)).toEqual(["/rest/v1/rpc/consume_rate_limit"]);
  });

  it("enforces origin and rate limits before looking up a public reference", async () => {
    const forbidden = await track(request(reference, "/api/track", "https://attacker.example"));
    expect(forbidden.status).toBe(403);
    expect(calls).toEqual([]);
    allowed = false;
    const limited = await track(request(reference));
    expect(limited.status).toBe(429);
    expect(calls.map(({ url }) => url.pathname)).toEqual(["/rest/v1/rpc/consume_rate_limit"]);
  });

  it("does not expose database error details in the public response or diagnostics", async () => {
    databaseError = true;
    const response = await track(request(reference));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "unavailable" });
    expect(diagnostics.captureServerError.mock.calls[0][0].message).toBe("unavailable");
  });
});
