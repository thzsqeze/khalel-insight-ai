import { respond, assertSameOrigin, readJson } from "@/lib/server/http";
import { requireAdmin, requireOwner } from "@/lib/server/auth";
import { getTicketRepository } from "@/lib/server/ticket-repository";
import { departmentCreateSchema } from "@/lib/server/ticket-validation";
export const runtime = "nodejs";
export async function GET() {
  return respond(async () => {
    const session = await requireAdmin();
    return { departments: await getTicketRepository().departments(session.id) };
  });
}
export async function POST(request: Request) {
  return respond(async () => {
    const session = await requireOwner();
    assertSameOrigin(request);
    await getTicketRepository().createDepartment(
      departmentCreateSchema.parse(await readJson(request)),
      session.id,
    );
    return { ok: true };
  });
}
