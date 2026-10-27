import { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { IssueList } from "@/components/admin/issue-list";
import { TicketList } from "@/components/admin/ticket-list";
import { DashboardSkeleton } from "@/components/admin/shared";
export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; report?: string; ticket?: string }>;
}) {
  const params = await searchParams;
  const grouped = params.tab === "groups" && !params.ticket && !params.report;
  const t = await getTranslations("tickets");
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {grouped ? (
        <div className="space-y-5">
          <Link
            href="/admin/issues"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="size-3.5" />
            {t("backToQueue")}
          </Link>
          <IssueList />
        </div>
      ) : (
        <TicketList />
      )}
    </Suspense>
  );
}
