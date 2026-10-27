import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({
  role: "owner" as string | null,
  recover: vi.fn(),
  rateLimit: vi.fn(),
}));
vi.mock("@/lib/server/auth", async () => {
  const { ApiError } = await import("@/lib/server/errors");
  return {
    requireOwner: async () => {
      if (!fixture.role) throw new ApiError("unauthorized", 401);
      if (fixture.role !== "owner") throw new ApiError("forbidden", 403);
      return { id: "owner", role: "owner" };
    },
  };
});
vi.mock("@/lib/server/team", () => ({ recoverTeamMember: fixture.recover }));
vi.mock("@/lib/server/http", async (original) => ({
  ...(await original<typeof import("@/lib/server/http")>()),
  rateLimit: fixture.rateLimit,
}));
import { POST } from "@/app/api/admin/team/[id]/recovery/route";
const context = { params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000002" }) };
function request(body: object = {}, origin = "https://voice.example.test") {
  return new Request("https://voice.example.test/api/admin/team/target/recovery", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  fixture.role = "owner";
  fixture.recover.mockResolvedValue(undefined);
  fixture.rateLimit.mockResolvedValue(undefined);
  vi.stubEnv("APP_ORIGIN", "https://voice.example.test");
});
afterEach(() => vi.unstubAllEnvs());
describe("owner password recovery route", () => {
  it.each([null, "viewer", "admin", "moderator"])("rejects %s before emailing", async (role) => {
    fixture.role = role;
    expect((await POST(request(), context)).status).toBe(role ? 403 : 401);
    expect(fixture.recover).not.toHaveBeenCalled();
  });
  it("checks the origin and rejects client email destinations", async () => {
    expect((await POST(request({}, "https://attacker.test"), context)).status).toBe(403);
    expect((await POST(request({ email: "attacker@example.test" }), context)).status).toBe(400);
    expect(fixture.recover).not.toHaveBeenCalled();
  });
  it("applies the 20 per hour limiter before a server-selected recovery action", async () => {
    const req = request();
    expect((await POST(req, context)).status).toBe(200);
    expect(fixture.rateLimit).toHaveBeenCalledWith(req, "team-recovery", 20);
    expect(fixture.recover).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000002");
  });
});
