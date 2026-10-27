import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/server/auth";
import { TeamManagement } from "@/components/admin/team-management";
export default async function TeamPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  if (session.role !== "owner") redirect("/admin");
  return <TeamManagement currentUserId={session.id} />;
}
