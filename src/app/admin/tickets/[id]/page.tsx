import { redirect } from "next/navigation";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/issues?ticket=${encodeURIComponent(id)}`);
}
