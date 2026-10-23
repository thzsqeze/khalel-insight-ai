"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, ArrowRight, RefreshCw, MessagesSquare } from "lucide-react";
import { useRemote } from "@/lib/client-api";
import { computeAnalytics } from "@/lib/analytics";
import { formatDate } from "@/lib/utils";
import type { AdminSnapshot } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CategoryChart, TrendChart } from "./charts";
import { DashboardSkeleton, DataError, IssueTable, PeriodSelect } from "./shared";

export function Dashboard() {
  const t = useTranslations("admin");
  const c = useTranslations("categories");
  const locale = useLocale();
  const { data, error, loading, reload } = useRemote<AdminSnapshot>("/api/admin/overview");
  const [days, setDays] = useState(30);
  if (error) return <DataError error={error} retry={reload} />;
  if (!data) return <DashboardSkeleton />;
  const stats = computeAnalytics(data, days);
  const reviewQueue = [...stats.filtered.submissions].filter(report => !report.analysis?.reviewed).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
  const metrics = [
    { label: t("total"), value: stats.total, description: t("reportsInPeriod") },
    { label: t("recurring"), value: stats.recurring, description: t("groupsDescription") },
    { label: t("active"), value: stats.active, description: t("activeDescription") },
    { label: t("resolved"), value: stats.resolved, description: stats.filtered.issues.length ? t("resolvedDescription", { percent: stats.resolutionRate }) : t("noIssuesYet") },
  ];
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div><h1 className="text-[25px] font-semibold tracking-[-0.8px] sm:text-[28px]">{t("hello")}</h1><p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{t("overviewSubtitle")}</p></div>
      <div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="icon" onClick={reload} disabled={loading} aria-label={t("refresh")}><RefreshCw className={loading ? "animate-spin" : ""} /></Button><PeriodSelect value={days} onChange={setDays} /><Button asChild variant="outline" className="text-xs"><Link href="/issues">{t("viewPublic")}<ArrowUpRight /></Link></Button></div>
    </div>
    {!data.submissions.length && <section className="flex flex-col gap-6 rounded-2xl bg-[#294b3c] p-7 text-white sm:flex-row sm:items-center sm:p-9"><span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[#dce8a9] text-[#294b3c]"><MessagesSquare className="size-8" strokeWidth={1.5} /></span><div className="flex-1"><h2 className="text-xl font-medium tracking-tight">{t("onboardingTitle")}</h2><p className="mt-2 max-w-2xl text-sm leading-7 text-[#d4dece]">{t("onboardingBody")}</p></div><Button asChild className="bg-[#dce8a9] text-[#294b3c] hover:bg-[#e9f0c9]"><Link href="/submit">{t("onboardingAction")}<ArrowUpRight /></Link></Button></section>}
    <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-[#fffefa] py-2 sm:py-5 xl:grid-cols-4">
      {metrics.map((metric, index) => <div key={metric.label} className={`px-5 py-3 sm:px-6 xl:py-0 ${index % 2 ? "border-l border-border" : ""} ${index === 2 ? "xl:border-l" : ""}`}><dt className="text-xs text-muted-foreground">{metric.label}</dt><dd className="mt-3 text-[34px] font-medium leading-none tracking-[-1.5px] tabular-nums">{metric.value.toLocaleString(locale)}</dd><dd className="mt-3 text-[11px] leading-4 text-muted-foreground">{metric.description}</dd></div>)}
    </dl>
    <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]"><TrendChart data={stats.trend} /><CategoryChart data={stats.categories} total={stats.total} /></div>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
      <Card className="min-w-0 overflow-hidden"><CardHeader className="flex-row items-start justify-between gap-4"><div><CardTitle>{t("recentIssues")}</CardTitle><CardDescription className="mt-1.5 text-xs">{t("recentSubtitle")}</CardDescription></div><Link href="/admin/issues" className="flex shrink-0 items-center gap-1.5 pt-0.5 text-xs font-medium text-primary">{t("viewAll")}<ArrowRight className="size-3.5" /></Link></CardHeader><IssueTable compact issues={[...stats.filtered.issues].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5)} /></Card>
      <Card className="min-w-0 overflow-hidden"><CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle>{t("reviewQueue")}</CardTitle><CardDescription className="mt-1.5 text-xs">{t("reviewQueueDescription")}</CardDescription></div><span className="flex h-6 min-w-6 items-center justify-center rounded border border-[#d8decf] bg-[#eff2e9] px-1.5 text-xs font-medium tabular-nums text-[#526348]">{stats.needsReview}</span></CardHeader>
        {reviewQueue.length ? <div className="divide-y divide-border border-t border-border">{reviewQueue.map(report => <Link key={report.id} href={`/admin/issues?tab=reports&days=${days}&report=${report.id}`} className="group block px-6 py-4 transition-colors hover:bg-[#fafbf7]"><div className="flex items-center justify-between gap-3"><span className="text-[10px] tracking-wide text-muted-foreground">{report.reference}</span><span className="text-[10px] text-muted-foreground">{formatDate(report.createdAt, locale)}</span></div><p className="mt-2 line-clamp-2 text-[13px] leading-5 group-hover:text-primary">{report.analysis?.summary ?? report.description}</p><div className="mt-2.5 flex items-center justify-between gap-2"><span className="truncate text-[11px] text-muted-foreground">{c(report.category)}</span><ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" /></div></Link>)}</div> : <p className="px-6 pb-6 text-sm text-muted-foreground">{t("reviewQueueEmpty")}</p>}
        <Link href="/admin/issues?tab=reports" className="flex items-center justify-between gap-3 border-t border-border px-6 py-3.5 text-xs font-medium text-primary hover:bg-[#fafbf7]">{t("reviewReports")}<ArrowRight className="size-3.5" /></Link>
      </Card>
    </div>
    <p className="text-[11px] leading-relaxed text-muted-foreground">{t("humanDecision")}</p>
  </div>;
}
