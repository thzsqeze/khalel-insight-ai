"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ChevronDown, ChevronUp, ShieldCheck, RefreshCw } from "lucide-react";
import { useRemote } from "@/lib/client-api";
import { filterSnapshot, type Filters } from "@/lib/analytics";
import { cn, formatDate } from "@/lib/utils";
import type { AdminSnapshot } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataError, DashboardSkeleton, EmptyState, FilterBar, IssueTable } from "./shared";
import { ReportReview } from "./report-review";

export function IssueList() {
  const t = useTranslations("admin"); const c = useTranslations("categories"); const locale = useLocale(); const searchParams = useSearchParams();
  const { data, error, loading, reload } = useRemote<AdminSnapshot>("/api/admin/overview");
  const [tab, setTab] = useState(searchParams.get("tab") === "reports" ? "reports" : "issues");
  const [filters, setFilters] = useState<Filters>({ days: [7, 30, 90].includes(Number(searchParams.get("days"))) ? Number(searchParams.get("days")) : 30, category: "all", status: "all", query: "" });
  const [expanded, setExpanded] = useState<string | null>(searchParams.get("report"));
  if (error) return <DataError error={error} retry={reload} />;
  if (!data) return <DashboardSkeleton />;
  const filtered = filterSnapshot(data, filters);
  const ungrouped = filtered.submissions.filter(report => !report.issueId);
  const reports = [...(tab === "ungrouped" ? ungrouped : filtered.submissions)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const tabs = [{ id: "issues", label: t("clustersTab"), count: filtered.issues.length }, { id: "reports", label: t("inboxTab"), count: filtered.submissions.length }, { id: "ungrouped", label: t("ungroupedTab"), count: ungrouped.length }];
  return <div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight">{t("issuesTitle")}</h1><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("issuesSubtitle")}</p></div><Button variant="outline" size="sm" onClick={reload} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />{t("refresh")}</Button></div>
    <Card className="overflow-hidden"><div className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-2" role="tablist" aria-label={t("issues")}>{tabs.map(item => <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => { setTab(item.id); setExpanded(null); }} className={cn("relative flex shrink-0 items-center gap-2 border-b-2 px-3 py-4 text-xs font-medium", tab === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>{item.label}<span className={cn("rounded-md px-1.5 py-0.5 text-[11px]", tab === item.id ? "bg-[#eaf0e3]" : "bg-[#ebeee3]")}>{item.count}</span></button>)}</div><div className="p-5"><FilterBar filters={filters} onChange={setFilters} /></div>
    {tab === "issues" ? <IssueTable issues={[...filtered.issues].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))} /> : !reports.length ? <EmptyState filtered /> : <div className="divide-y divide-border">{reports.map(report => <div key={report.id}><button type="button" aria-expanded={expanded === report.id} aria-controls={`report-${report.id}`} onClick={() => setExpanded(expanded === report.id ? null : report.id)} className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-[#f5f6f0]"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-medium text-muted-foreground">{report.reference}</span><Badge variant="outline" className="text-[11px]">{c(report.category)}</Badge>{report.analysis?.reviewed && <Badge variant="default" className="text-[11px]">{t("reviewed")}</Badge>}</div><p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-foreground">{report.analysis?.summary ?? report.description}</p><p className="mt-1.5 text-[11px] text-muted-foreground">{t(report.role)} · {formatDate(report.createdAt, locale)}</p></div>{expanded === report.id ? <ChevronUp className="mt-3 size-4 text-muted-foreground" /> : <ChevronDown className="mt-3 size-4 text-muted-foreground" />}</button>{expanded === report.id && <div id={`report-${report.id}`} className="border-t border-dashed border-border bg-[#fafbf7] p-5 sm:px-8"><ReportReview key={`${report.id}-${report.analysis?.reviewed}-${report.analysisStatus}`} report={report} onUpdate={reload} allowCreate /></div>}</div>)}</div>}
    </Card><p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground"><ShieldCheck className="size-3" />{t("privateData")}</p>
  </div>;
}
