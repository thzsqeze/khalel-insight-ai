import { beforeEach, describe, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({
  role: "owner" as string | null,
  rpc: vi.fn(),
  invite: vi.fn(),
  recover: vi.fn(),
  identity: vi.fn(),
  list: vi.fn(),
  profiles: [{ id: "00000000-0000-4000-8000-000000000002", role: "viewer", is_owner: false }],
  serviceCalls: 0,
}));
vi.mock("@/lib/server/auth", async () => {
  const { ApiError } = await import("@/lib/server/errors");
  const requireAdmin = async () => {
    if (!fixture.role || fixture.role === "viewer") throw new ApiError("unauthorized", 401);
    return {
      id: "00000000-0000-4000-8000-000000000001",
      email: "owner@example.test",
      role: fixture.role,
    };
  };
  return {
    requireAdmin,
    requireOwner: async () => {
      const session = await requireAdmin();
      if (session.role !== "owner") throw new ApiError("forbidden", 403);
      return session;
    },
  };
});
vi.mock("@/lib/server/supabase", () => ({
  sessionClient: async () => ({ rpc: fixture.rpc }),
  serviceClient: () => {
    fixture.serviceCalls++;
    return {
      auth: {
        admin: {
          inviteUserByEmail: fixture.invite,
          listUsers: fixture.list,
          getUserById: fixture.identity,
        },
        resetPasswordForEmail: fixture.recover,
      },
      from: () => ({
        select: () => ({ in: async () => ({ data: fixture.profiles, error: null }) }),
      }),
    };
  },
}));
import {
  changeTeamRole,
  getTeamPage,
  invitationRedirect,
  inviteTeamMember,
  recoverTeamMember,
} from "@/lib/server/team";
const target = "00000000-0000-4000-8000-000000000002";
beforeEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  fixture.serviceCalls = 0;
  fixture.role = "owner";
  fixture.profiles = [{ id: target, role: "viewer", is_owner: false }];
  fixture.rpc.mockResolvedValue({ error: null });
  fixture.invite.mockResolvedValue({ error: null, data: { user: { id: target } } });
  fixture.identity.mockResolvedValue({
    error: null,
    data: { user: { id: target, email: "stored@example.test" } },
  });
  fixture.recover.mockResolvedValue({ error: null });
  fixture.list.mockResolvedValue({
    error: null,
    data: {
      users: [
        {
          id: target,
          email: "staff@example.test",
          email_confirmed_at: "2026-10-27",
          user_metadata: { role: "owner", secret: "private" },
        },
      ],
      total: 1,
    },
  });
  vi.stubEnv("APP_ORIGIN", "https://voice.example.test");
});
describe("owner team operations", () => {
  it.each([null, "viewer", "admin", "moderator"])(
    "denies %s before any privileged team calls",
    async (role) => {
      fixture.role = role;
      await expect(changeTeamRole(target, { role: "owner" })).rejects.toThrow();
      await expect(getTeamPage()).rejects.toThrow();
      await expect(inviteTeamMember({ email: "staff@example.test" })).rejects.toThrow();
      await expect(recoverTeamMember(target)).rejects.toThrow();
      expect(fixture.rpc).not.toHaveBeenCalled();
      expect(fixture.serviceCalls).toBe(0);
    },
  );
  it("sends only the target and requested role through the caller's authenticated RPC", async () => {
    await changeTeamRole(target, { role: "admin" });
    expect(fixture.rpc).toHaveBeenCalledWith("change_role", { p_target: target, p_role: "admin" });
    expect(fixture.serviceCalls).toBe(0);
  });
  it("does not allow an injected actor or role escalation metadata", async () => {
    await expect(changeTeamRole(target, { role: "admin", actor: target })).rejects.toThrow();
    await expect(changeTeamRole(target, { role: "superadmin" })).rejects.toThrow();
    expect(fixture.rpc).not.toHaveBeenCalled();
  });
  it("rejects self-role change before making a database mutation", async () => {
    await expect(
      changeTeamRole("00000000-0000-4000-8000-000000000001", { role: "viewer" }),
    ).rejects.toThrow("self_role_change");
    expect(fixture.rpc).not.toHaveBeenCalled();
  });
  it.each(["forbidden", "last_owner", "self_role_change", "user_unconfirmed"])(
    "preserves authoritative RPC denial %s",
    async (message) => {
      fixture.rpc.mockResolvedValue({ error: { message } });
      await expect(changeTeamRole(target, { role: "admin" })).rejects.toThrow(message);
    },
  );
  it("uses bounded identity pages and returns only whitelisted fields and database roles", async () => {
    expect(await getTeamPage(1)).toEqual({
      page: 1,
      hasNext: false,
      members: [
        {
          id: target,
          email: "staff@example.test",
          role: "viewer",
          confirmed: true,
          invited: false,
        },
      ],
    });
    expect(fixture.list).toHaveBeenCalledWith({ page: 1, perPage: 50 });
    await expect(getTeamPage(0)).rejects.toThrow();
    await expect(getTeamPage(10001)).rejects.toThrow();
  });
  it("derives the invitation callback only from the configured app origin", async () => {
    await inviteTeamMember({ email: "staff@example.test" });
    expect(fixture.invite).toHaveBeenCalledWith("staff@example.test", {
      redirectTo: "https://voice.example.test/auth/setup-password",
    });
    expect(fixture.rpc).not.toHaveBeenCalled();
  });
  it("projects the protected admin ownership flag as the outward owner role", async () => {
    fixture.profiles = [{ id: target, role: "admin", is_owner: true }];
    expect((await getTeamPage()).members[0].role).toBe("owner");
    fixture.profiles[0].is_owner = false;
    expect((await getTeamPage()).members[0].role).toBe("admin");
  });
  it("never grants a role even when invitation fails for an existing identity", async () => {
    fixture.invite.mockResolvedValue({ error: { code: "email_exists", status: 422 } });
    await expect(inviteTeamMember({ email: "staff@example.test" })).rejects.toThrow("email_exists");
    expect(fixture.rpc).not.toHaveBeenCalled();
    await expect(
      inviteTeamMember({ email: "staff@example.test", role: "owner" }),
    ).rejects.toThrow();
  });
  it("sends password recovery only to the identity's stored email with the configured callback", async () => {
    await recoverTeamMember(target);
    expect(fixture.identity).toHaveBeenCalledWith(target);
    expect(fixture.recover).toHaveBeenCalledWith("stored@example.test", {
      redirectTo: "https://voice.example.test/auth/setup-password",
    });
    expect(fixture.rpc).not.toHaveBeenCalled();
  });
  it("does not send recovery or grant roles when identity lookup fails", async () => {
    fixture.identity.mockResolvedValue({ error: { message: "not found" }, data: { user: null } });
    await expect(recoverTeamMember(target)).rejects.toThrow("not_found");
    expect(fixture.recover).not.toHaveBeenCalled();
    expect(fixture.rpc).not.toHaveBeenCalled();
  });
  it("returns a safe delivery error without updating roles on recovery failure", async () => {
    fixture.recover.mockResolvedValue({
      error: { status: 429, message: "private provider context" },
    });
    await expect(recoverTeamMember(target)).rejects.toMatchObject({
      code: "recovery_failed",
      status: 429,
    });
    expect(fixture.rpc).not.toHaveBeenCalled();
  });
  it.each([
    "",
    "https://voice.example.test/path",
    "https://u:p@voice.example.test",
    "http://voice.example.test",
  ])("rejects unsafe callback origin %s", (origin) => {
    vi.stubEnv("APP_ORIGIN", origin);
    expect(() => invitationRedirect()).toThrow("unavailable");
  });
});
