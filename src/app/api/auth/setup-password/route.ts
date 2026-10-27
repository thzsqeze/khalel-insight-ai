import { assertSameOrigin, readJson, respond, rateLimit } from "@/lib/server/http";
import { setupInvitedPassword, setupPasswordSchema } from "@/lib/server/invitation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return respond(async () => {
    assertSameOrigin(request);
    const input = setupPasswordSchema.parse(await readJson(request));
    await rateLimit(request, "invitation-setup", 10, 15 * 60 * 1000);
    await setupInvitedPassword(input);
    return { ok: true };
  });
}
