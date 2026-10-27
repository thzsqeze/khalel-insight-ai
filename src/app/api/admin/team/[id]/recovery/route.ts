import { z } from "zod";
import { requireOwner } from "@/lib/server/auth";
import { assertSameOrigin, readJson, respond, rateLimit } from "@/lib/server/http";
import { recoverTeamMember } from "@/lib/server/team";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return respond(async () => {
    assertSameOrigin(request);
    await requireOwner();
    const id = z.uuid().parse((await context.params).id);
    z.object({})
      .strict()
      .parse(await readJson(request));
    await rateLimit(request, "team-recovery", 20);
    await recoverTeamMember(id);
    return { ok: true };
  });
}
