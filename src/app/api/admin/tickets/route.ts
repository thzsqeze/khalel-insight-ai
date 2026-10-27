import { respond } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth";
import { getTicketRepository } from "@/lib/server/ticket-repository";
import { getStaffDirectory } from "@/lib/server/team";
export const runtime = "nodejs";
export async function GET() {
  return respond(async () => {
    const session = await requireAdmin();
    const [queue, staff] = await Promise.all([
      getTicketRepository().queue(session.id),
      getStaffDirectory(),
    ]);
    return { ...queue, staff };
  });
}
