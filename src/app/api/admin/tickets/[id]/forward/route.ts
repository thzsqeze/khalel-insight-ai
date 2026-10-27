import { z } from "zod";
import { requireAdmin } from "@/lib/server/auth";
import { respond, assertSameOrigin, readJson, rateLimit } from "@/lib/server/http";
import { forwardTicket } from "@/lib/server/ticket-email";
import { getRepository } from "@/lib/server/repository";
import { ApiError } from "@/lib/server/errors";

export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return respond(async () => {
    assertSameOrigin(request);
    const actor = await requireAdmin();
    const id = z.uuid().parse((await context.params).id);
    const { requestId } = z
      .object({ requestId: z.uuid() })
      .strict()
      .parse(await readJson(request));
    await rateLimit(request, "ticket-email", 20, 10 * 60 * 1000);
    if (
      !(await getRepository().consumeRateLimit(actor.id, "ticket-email-actor", 10, 10 * 60 * 1000))
    )
      throw new ApiError("rate_limited", 429);
    return forwardTicket(id, actor.id, requestId);
  });
}
