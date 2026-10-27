import { respond, assertSameOrigin, readJson } from "@/lib/server/http";
import { requireOwner } from "@/lib/server/auth";
import { getTicketRepository } from "@/lib/server/ticket-repository";
import { departmentPatchSchema, ticketIdSchema } from "@/lib/server/ticket-validation";
export const runtime = "nodejs";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return respond(async () => {
    const session = await requireOwner();
    assertSameOrigin(request);
    const id = ticketIdSchema.parse((await context.params).id);
    await getTicketRepository().patchDepartment(
      id,
      departmentPatchSchema.parse(await readJson(request)),
      session.id,
    );
    return { ok: true };
  });
}
