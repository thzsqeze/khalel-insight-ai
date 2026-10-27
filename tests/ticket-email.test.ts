import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/server/supabase", () => ({ serviceClient: () => ({ rpc }) }));
import { forwardTicket, emailConfiguration } from "@/lib/server/ticket-email";
const id = "11111111-1111-4111-8111-111111111111";
const actor = "22222222-2222-4222-8222-222222222222";
const requestId = "33333333-3333-4333-8333-333333333333";
const reserved = {
  id: requestId,
  recipient: "department@example.edu",
  reference: "UV-1234",
  status: "pending",
  shouldSend: true,
};
beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "test-only-key");
  vi.stubEnv("EMAIL_FROM", "univoice@example.edu");
  vi.stubEnv("EMAIL_APP_ORIGIN", "https://univoice.example.edu");
  rpc
    .mockReset()
    .mockResolvedValueOnce({ data: reserved, error: null })
    .mockResolvedValue({ error: null });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("department email forwarding", () => {
  it("requires valid server sender and public HTTPS origin before reserving", async () => {
    vi.stubEnv("EMAIL_APP_ORIGIN", "http://localhost:3000");
    expect(() => emailConfiguration()).toThrow("email_configuration");
    await expect(forwardTicket(id, actor, requestId)).rejects.toMatchObject({
      code: "email_configuration",
    });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("uses only DB recipient/reference, authenticated ticket link and persistent idempotency key", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "provider-id" })));
    vi.stubGlobal("fetch", fetcher);
    await expect(forwardTicket(id, actor, requestId)).resolves.toEqual({ ok: true });
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(options.body);
    expect(body.to).toEqual([reserved.recipient]);
    expect(body.text).toContain(`/admin/tickets/${id}`);
    expect(Object.keys(body).sort()).toEqual(["from", "subject", "text", "to"]);
    expect(options.headers["Idempotency-Key"]).toBe(`univoice-ticket/${requestId}`);
    expect(options.redirect).toBe("error");
    expect(rpc).toHaveBeenLastCalledWith(
      "finalize_ticket_email",
      expect.objectContaining({ p_status: "sent", p_provider_id: "provider-id", p_actor: actor }),
    );
  });
  it.each(["sent", "pending", "failed"])(
    "does not send an existing %s reservation twice",
    async (status) => {
      rpc
        .mockReset()
        .mockResolvedValue({ data: { ...reserved, shouldSend: false, status }, error: null });
      const fetcher = vi.fn();
      vi.stubGlobal("fetch", fetcher);
      if (status === "sent")
        await expect(forwardTicket(id, actor, requestId)).resolves.toEqual({ ok: true });
      else
        await expect(forwardTicket(id, actor, requestId)).rejects.toMatchObject({
          code: status === "pending" ? "email_pending" : "email_failed",
        });
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("fails closed when the database rejects the actor", async () => {
    rpc.mockReset().mockResolvedValue({ data: null, error: { message: "forbidden" } });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(forwardTicket(id, actor, requestId)).rejects.toMatchObject({ code: "forbidden" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("records an explicit provider rejection without provider error content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("sensitive provider details", { status: 422 })),
    );
    await expect(forwardTicket(id, actor, requestId)).rejects.toMatchObject({
      code: "email_failed",
    });
    expect(rpc).toHaveBeenLastCalledWith(
      "finalize_ticket_email",
      expect.objectContaining({ p_status: "failed", p_provider_id: null }),
    );
  });
  it("leaves unknown network outcome pending instead of retrying", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    await expect(forwardTicket(id, actor, requestId)).rejects.toMatchObject({
      code: "email_uncertain",
    });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
