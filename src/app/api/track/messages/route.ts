import { respond, assertSameOrigin, readJson, rateLimit } from "@/lib/server/http";
import { getTicketRepository } from "@/lib/server/ticket-repository";
import { followUpSchema } from "@/lib/server/ticket-validation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return respond(async () => {
    assertSameOrigin(request);
    await rateLimit(request, "ticket-follow-up", 12, 10 * 60 * 1000);
    const { code, body } = followUpSchema.parse(await readJson(request));
    await getTicketRepository().followUp(code, body);
    return { ok: true };
  });
}
