import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/server/auth";
import { AdminShell } from "@/components/admin/shell";
export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) { const session = await getAdminSession(); if (!session) redirect("/login"); return <AdminShell session={session}>{children}</AdminShell>; }
