import { beforeEach, describe, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({
  setSession: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/lib/server/supabase", () => ({ sessionClient: async () => ({ auth: fixture }) }));
import { setupInvitedPassword } from "@/lib/server/invitation";
const input = {
  accessToken: "secret-access-token-long-enough",
  refreshToken: "secret-refresh-token",
  password: "correct horse battery staple",
};
beforeEach(() => {
  vi.clearAllMocks();
  fixture.setSession.mockResolvedValue({ error: null });
  fixture.getUser.mockResolvedValue({
    error: null,
    data: { user: { id: "employee", invited_at: "2026-10-27", email_confirmed_at: "2026-10-27" } },
  });
  fixture.updateUser.mockResolvedValue({ error: null });
  fixture.signOut.mockResolvedValue({ error: null });
});
describe("invitation password setup", () => {
  it("verifies the invitation session before setting only its own password and signing out", async () => {
    await setupInvitedPassword(input);
    expect(fixture.setSession).toHaveBeenCalledWith({
      access_token: input.accessToken,
      refresh_token: input.refreshToken,
    });
    expect(fixture.getUser).toHaveBeenCalled();
    expect(fixture.updateUser).toHaveBeenCalledWith({ password: input.password });
    expect(fixture.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("does not update a password from invalid or unverified tokens", async () => {
    fixture.setSession.mockResolvedValue({ error: { message: "expired token" } });
    await expect(setupInvitedPassword(input)).rejects.toThrow("invitation_expired");
    expect(fixture.updateUser).not.toHaveBeenCalled();
  });
  it.each([{ id: "employee" }, { id: "employee", invited_at: "2026-10-27" }])(
    "rejects an unconfirmed identity",
    async (user) => {
      fixture.getUser.mockResolvedValue({ error: null, data: { user } });
      await expect(setupInvitedPassword(input)).rejects.toThrow("invitation_expired");
      expect(fixture.updateUser).not.toHaveBeenCalled();
      expect(fixture.signOut).toHaveBeenCalled();
    },
  );
  it("allows a confirmed existing employee to set their own password after recovery", async () => {
    fixture.getUser.mockResolvedValue({
      error: null,
      data: { user: { id: "existing-admin", email_confirmed_at: "2026-10-27" } },
    });
    await setupInvitedPassword(input);
    expect(fixture.updateUser).toHaveBeenCalledWith({ password: input.password });
    expect(fixture.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("validates password length and rejects extra authorization fields before session creation", async () => {
    await expect(setupInvitedPassword({ ...input, password: "short" })).rejects.toThrow();
    await expect(setupInvitedPassword({ ...input, role: "owner" })).rejects.toThrow();
    expect(fixture.setSession).not.toHaveBeenCalled();
  });
});
