import { requireOwner } from "@/lib/server/auth";
import { assertSameOrigin, readJson, respond, rateLimit } from "@/lib/server/http";
import { inviteSchema, inviteTeamMember } from "@/lib/server/team";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return respond(async () => {
    assertSameOrigin(request);
    await requireOwner();
    const input = inviteSchema.parse(await readJson(request));
    await rateLimit(request, "team-invite", 20);
    await inviteTeamMember(input);
    return { ok: true };
  }, 201);
}
