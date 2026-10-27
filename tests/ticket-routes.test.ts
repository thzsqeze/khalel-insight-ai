import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { GET as detail, PATCH as patch } from "@/app/api/admin/tickets/[id]/route";
import { POST as message } from "@/app/api/admin/tickets/[id]/messages/route";
import { POST as followUp } from "@/app/api/track/messages/route";
import { POST as department } from "@/app/api/admin/departments/route";
import { ApiError } from "@/lib/server/errors";
const state = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  requireOwner: vi.fn(),
  consumeRateLimit: vi.fn(),
  captureServerError: vi.fn(),
}));
vi.mock("@/lib/server/auth", () => ({
  requireAdmin: state.requireAdmin,
  requireOwner: state.requireOwner,
}));
vi.mock("@/lib/server/repository", () => ({
  getRepository: () => ({ consumeRateLimit: state.consumeRateLimit }),
}));
vi.mock("@/lib/server/diagnostics", () => ({ captureServerError: state.captureServerError }));
const actor = "10000000-0000-4000-8000-000000000002";
const id = "20000000-0000-4000-8000-000000000001";
const context = { params: Promise.resolve({ id }) };
const outbound: { path: string; body: Record<string, unknown> }[] = [];
function request(path: string, body: unknown, origin = "http://localhost:3000", method = "POST") {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: { origin, host: "localhost:3000", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  outbound.length = 0;
  vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
  state.requireAdmin.mockResolvedValue({ id: actor, role: "admin", email: "staff@example.edu" });
  state.requireOwner.mockRejectedValue(new ApiError("forbidden", 403));
  state.consumeRateLimit.mockResolvedValue(true);
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    outbound.push({ path: new URL(req.url).pathname, body: await req.json() });
    return new Response(JSON.stringify(id), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("ticket API privacy and authorization", () => {
  it("denies unauthenticated detail reads before issuing a privileged database request", async () => {
    state.requireAdmin.mockRejectedValue(new ApiError("unauthorized", 401));
    const response = await detail(
      new Request(`http://localhost:3000/api/admin/tickets/${id}`),
      context,
    );
    expect(response.status).toBe(401);
    expect(outbound).toEqual([]);
  });
  it("rejects forged actor IDs and invalid path IDs", async () => {
    expect(
      (
        await message(
          request("/api/admin/tickets/x/messages", {
            kind: "reply",
            body: "hello",
            actorId: actor,
          }),
          context,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await patch(request("/api/admin/tickets/x", { status: "resolved" }, undefined, "PATCH"), {
          params: Promise.resolve({ id: "not-a-uuid" }),
        })
      ).status,
    ).toBe(400);
    expect(outbound).toEqual([]);
  });
  it("writes staff notes only with the verified session actor", async () => {
    const response = await message(
      request(`/api/admin/tickets/${id}/messages`, { kind: "note", body: "Private note" }),
      context,
    );
    expect(response.status).toBe(200);
    expect(outbound).toEqual([
      {
        path: "/rest/v1/rpc/ticket_action",
        body: {
          p_action: "message",
          p_id: id,
          p_payload: { kind: "note", body: "Private note" },
          p_actor: actor,
        },
      },
    ]);
  });
  it("posts only the token hash to the database and never places the bearer token in a URL", async () => {
    const code = "x".repeat(32);
    const response = await followUp(
      request("/api/track/messages", { code, body: "Follow-up from author" }),
    );
    expect(response.status).toBe(200);
    expect(outbound).toHaveLength(1);
    expect(outbound[0].path).toBe("/rest/v1/rpc/ticket_follow_up");
    expect(outbound[0].body.p_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(outbound)).not.toContain(code);
    expect(outbound[0].body).not.toHaveProperty("p_actor");
  });
  it("rejects cross-origin follow-ups and exhausted rate limits without writing", async () => {
    expect(
      (
        await followUp(
          request(
            "/api/track/messages",
            { code: "x".repeat(32), body: "follow up" },
            "https://attacker.example",
          ),
        )
      ).status,
    ).toBe(403);
    state.consumeRateLimit.mockResolvedValue(false);
    expect(
      (await followUp(request("/api/track/messages", { code: "x".repeat(32), body: "follow up" })))
        .status,
    ).toBe(429);
    expect(outbound).toEqual([]);
  });
  it("does not let administrators manage departments", async () => {
    const response = await department(
      request("/api/admin/departments", { name: "IT", email: "it@example.edu" }),
    );
    expect(response.status).toBe(403);
    expect(outbound).toEqual([]);
  });
  it("returns a generic database failure without logging report content or a tracking secret", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(
          JSON.stringify({
            message: "Private complaint xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            code: "XX000",
          }),
          { status: 500, headers: { "content-type": "application/json" } },
        ),
    );
    const response = await followUp(
      request("/api/track/messages", { code: "x".repeat(32), body: "Private complaint" }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "unavailable" });
    expect(state.captureServerError.mock.calls[0][0].message).toBe("unavailable");
  });
});
