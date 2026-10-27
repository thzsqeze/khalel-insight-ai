import { respond, assertSameOrigin, readJson, rateLimit } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";
import { getTicketRepository } from "@/lib/server/ticket-repository";
import { ticketIdSchema, ticketMessageSchema } from "@/lib/server/ticket-validation";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return respond(async () => {
    const session = await requireAdmin();
    assertSameOrigin(request);
    const id = ticketIdSchema.parse((await context.params).id);
    await rateLimit(request, `ticket-message:${session.id}`, 60, 10 * 60 * 1000);
    await getTicketRepository().message(
      id,
      ticketMessageSchema.parse(await readJson(request)),
      session.id,
    );
    return { ok: true };
  });
}
