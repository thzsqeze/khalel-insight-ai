import { assertSameOrigin, readJson, respond } from "@/lib/server/http";
import { changeTeamRole } from "@/lib/server/team";
export const runtime = "nodejs";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return respond(async () => {
    assertSameOrigin(request);
    await changeTeamRole((await context.params).id, await readJson(request));
    return { ok: true };
  });
}
