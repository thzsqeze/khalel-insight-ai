"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GraduationCap, Presentation, ShieldCheck } from "lucide-react";
import { useRemote } from "@/lib/client-api";
import { computeAnalytics, filterSnapshot, type Filters } from "@/lib/analytics";
import { statuses, type AdminSnapshot } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CategoryChart, TrendChart } from "./charts";
import { DataError, DashboardSkeleton, FilterBar, StatusBadge } from "./shared";

export function AnalyticsPage() {
  const t = useTranslations("admin"); const { data, error, reload } = useRemote<AdminSnapshot>("/api/admin/overview");
  const [filters, setFilters] = useState<Filters>({ days: 30, category: "all", status: "all", query: "" });
  if (error) return <DataError error={error} retry={reload} />;
  if (!data) return <DashboardSkeleton />;
  const stats = computeAnalytics(filterSnapshot(data, filters), filters.days);
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold tracking-tight">{t("analyticsTitle")}</h1><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("analyticsSubtitle")}</p></div><FilterBar filters={filters} onChange={setFilters} />
    <div className="grid gap-5 xl:grid-cols-[1.8fr_1fr]"><TrendChart data={stats.trend} /><CategoryChart data={stats.categories} total={stats.total} /></div>
    <div className="grid gap-5 md:grid-cols-2"><Card><CardHeader><CardTitle>{t("community")}</CardTitle><CardDescription className="text-xs">{t("communityDescription")}</CardDescription></CardHeader><CardContent className="space-y-6">{([{ role: "student", icon: GraduationCap, color: "#315747" }, { role: "teacher", icon: Presentation, color: "#a6b493" }] as const).map(item => <div key={item.role}><div className="mb-3 flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-muted-foreground"><item.icon className="size-4" />{t(item.role)}</span><span className="font-semibold">{stats.roles[item.role]} <span className="ml-2 text-xs font-normal text-muted-foreground">{stats.total ? Math.round(stats.roles[item.role] / stats.total * 100) : 0}%</span></span></div><div className="h-2 overflow-hidden rounded-full bg-[#ebeee3]"><div className="h-full rounded-full" style={{ width: `${stats.total ? stats.roles[item.role] / stats.total * 100 : 0}%`, backgroundColor: item.color }} /></div></div>)}</CardContent></Card>
    <Card><CardHeader><CardTitle>{t("resolutionProgress")}</CardTitle><CardDescription className="text-xs">{t("resolutionProgressDescription")}</CardDescription></CardHeader><CardContent className="space-y-4">{statuses.map(status => { const count = stats.filtered.issues.filter(issue => issue.status === status).length; return <div key={status} className="flex items-center gap-4"><div className="w-[145px] shrink-0"><StatusBadge status={status} /></div><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#ebeee3]"><div className="h-full rounded-full bg-[#8b9c7b]" style={{ width: `${stats.filtered.issues.length ? count / stats.filtered.issues.length * 100 : 0}%` }} /></div><span className="w-5 text-right text-xs font-medium">{count}</span></div>; })}</CardContent></Card></div>
    <p className="flex items-start gap-2 rounded-lg border border-border bg-white px-4 py-3 text-[11px] leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />{t("dataNote")}</p>
  </div>;
}
