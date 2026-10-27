import { respond, assertSameOrigin, readJson, rateLimit } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";
import { getTicketRepository } from "@/lib/server/ticket-repository";
import { ticketIdSchema, ticketPatchSchema } from "@/lib/server/ticket-validation";
import { ApiError } from "@/lib/server/errors";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return respond(async () => {
    const session = await requireAdmin();
    const id = ticketIdSchema.parse((await context.params).id);
    const detail = await getTicketRepository().detail(id, session.id);
    if (!detail) throw new ApiError("not_found", 404);
    return detail;
  });
}
export async function PATCH(request: Request, context: Context) {
  return respond(async () => {
    const session = await requireAdmin();
    assertSameOrigin(request);
    const id = ticketIdSchema.parse((await context.params).id);
    await rateLimit(request, `ticket-patch:${session.id}`, 120, 10 * 60 * 1000);
    await getTicketRepository().patch(
      id,
      ticketPatchSchema.parse(await readJson(request)),
      session.id,
    );
    return { ok: true };
  });
}
