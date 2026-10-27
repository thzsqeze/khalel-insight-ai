import { respond } from "@/lib/server/http";
import { getTeamPage } from "@/lib/server/team";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return respond(() => getTeamPage(new URL(request.url).searchParams.get("page") ?? 1));
}
