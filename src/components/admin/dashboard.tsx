"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import { MessagesSquare, Layers3, CircleDashed, CircleCheck, ArrowUpRight, ArrowRight, Sparkles, RefreshCw } from "lucide-react";
import { useRemote } from "@/lib/client-api";
import { computeAnalytics } from "@/lib/analytics";
import type { AdminSnapshot } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CategoryChart, TrendChart } from "./charts";
import { DashboardSkeleton, DataError, IssueTable, PeriodSelect } from "./shared";

export function Dashboard() {
  const t = useTranslations("admin"); const reduceMotion = useReducedMotion();
  const { data, error, loading, reload } = useRemote<AdminSnapshot>("/api/admin/overview");
  const [days, setDays] = useState(30);
  if (error) return <DataError error={error} retry={reload} />;
  if (!data) return <DashboardSkeleton />;
  const stats = computeAnalytics(data, days);
  const metrics = [
    { label: t("total"), value: stats.total, description: t("reportsInPeriod"), icon: MessagesSquare, color: "bg-[#edf5f3] text-[#328b76]" },
    { label: t("recurring"), value: stats.recurring, description: t("groupsDescription"), icon: Layers3, color: "bg-[#f2f0fa] text-[#9183c1]" },
    { label: t("active"), value: stats.active, description: t("activeDescription"), icon: CircleDashed, color: "bg-[#fff6e9] text-[#c8a060]" },
    { label: t("resolved"), value: stats.resolved, description: t("resolvedDescription", { percent: stats.resolutionRate }), icon: CircleCheck, color: "bg-[#eaf5ed] text-[#69a37c]" },
  ];
  return <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="mb-2 text-[10px] font-medium uppercase tracking-[1.4px] text-primary">KHALEL INSIGHT AI</p><h1 className="text-[25px] font-semibold tracking-[-0.9px] sm:text-[29px]">{t("hello")}<span className="text-primary">.</span></h1><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("overviewSubtitle")}</p></div><div className="flex items-center gap-2 pt-3"><Button variant="outline" size="icon" onClick={reload} disabled={loading} aria-label={t("refresh")}><RefreshCw className={loading ? "animate-spin" : ""} /></Button><PeriodSelect value={days} onChange={setDays} /><Button asChild className="hidden text-xs sm:inline-flex"><Link href="/issues">{t("viewPublic")}<ArrowUpRight /></Link></Button></div></div>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-5">{metrics.map(metric => <Card key={metric.label} className="p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><p className="text-[11px] font-medium text-slate-500">{metric.label}</p><span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${metric.color}`}><metric.icon className="size-4" strokeWidth={1.8} /></span></div><p className="mt-3 text-[32px] font-semibold tracking-[-1px]">{metric.value}</p><p className="mt-2 text-[10px] leading-relaxed text-slate-400">{metric.description}</p></Card>)}</div>
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.8fr_1fr]"><TrendChart data={stats.trend} /><CategoryChart data={stats.categories} total={stats.total} /></div>
    <div className="relative flex flex-wrap items-center gap-5 overflow-hidden rounded-xl border border-[#cee3d8] bg-[#eef6f1] px-5 py-5 sm:px-6"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-xs"><Sparkles className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-[#285e4c]">{t("aiBrief")}</h2><span className="rounded border border-[#d6e5d7] bg-[#e9f2e6] px-1.5 py-0.5 text-[8px] font-semibold tracking-[0.7px] text-[#6b8c60]">{t("aiBriefLabel")}</span></div><p className="mt-1.5 text-[11px] leading-relaxed text-[#6b8679]">{t("aiBriefBody", { count: stats.needsReview })}</p></div><Button size="sm" variant="outline" asChild className="border-[#c8ded1] bg-white/60 text-[#386f55]"><Link href="/admin/issues?tab=reports">{t("reviewReports")}<ArrowRight /></Link></Button></div>
    <Card className="overflow-hidden"><CardHeader className="flex-row items-center justify-between gap-4"><div><CardTitle>{t("recentIssues")}</CardTitle><CardDescription className="mt-1.5 text-[11px]">{t("recentSubtitle")}</CardDescription></div><Link href="/admin/issues" className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-primary">{t("viewAll")}<ArrowRight className="size-3.5" /></Link></CardHeader><IssueTable issues={[...stats.filtered.issues].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5)} /></Card>
    <p className="text-center text-[10px] leading-relaxed text-slate-400">{t("humanDecision")}</p>
  </motion.div>;
}
