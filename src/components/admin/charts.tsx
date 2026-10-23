"use client";

import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { Category } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "./shared";

export const chartColors = ["#315747", "#6c8365", "#9fae8c", "#c3cbb3", "#899789", "#adb5a4", "#d8ddcf"];
export function TrendChart({ data }: { data: { date: string; count: number; resolved: number }[] }) {
  const t = useTranslations("admin"); const locale = useLocale(); const gradientId = useId().replace(/:/g, "");
  const dateLabel = (value: string) => formatDate(value, locale);
  return <Card className="min-w-0"><CardHeader className="flex-row flex-wrap items-start justify-between gap-3 pb-3"><div><CardTitle>{t("trend")}</CardTitle><CardDescription className="mt-1.5 text-xs">{t("trendDescription")}</CardDescription></div><div className="flex gap-4 pt-1 text-[11px] text-muted-foreground"><span className="flex items-center gap-1.5"><span className="h-0.5 w-3.5 bg-[#315747]" />{t("reports")}</span><span className="flex items-center gap-1.5"><span className="h-0.5 w-3.5 border-t border-dashed border-[#9cae87]" />{t("resolutions")}</span></div></CardHeader>
    <CardContent className="pb-5 pl-2 pr-5"><div className="h-[260px] w-full" role="img" aria-label={t("trend")}><ResponsiveContainer width="100%" height="100%" minWidth={0}><AreaChart data={data} margin={{ top: 18, right: 8, bottom: 0, left: 0 }}><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7f9977" stopOpacity={0.2} /><stop offset="100%" stopColor="#7f9977" stopOpacity={0.015} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e9ebe3" strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={dateLabel} tick={{ fill: "#74786e", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={36} dy={9} /><YAxis allowDecimals={false} tick={{ fill: "#74786e", fontSize: 11 }} axisLine={false} tickLine={false} width={34} /><Tooltip labelFormatter={value => dateLabel(String(value))} contentStyle={{ border: "1px solid #dedfd7", borderRadius: 6, fontSize: 12, boxShadow: "0 4px 16px #2427220d" }} /><Area type="monotone" dataKey="count" name={t("reports")} stroke="#315747" strokeWidth={2} fill={`url(#${gradientId})`} activeDot={{ r: 4, stroke: "white", strokeWidth: 2 }} isAnimationActive={false} /><Area type="monotone" dataKey="resolved" name={t("resolutions")} stroke="#9cae87" strokeDasharray="4 4" strokeWidth={1.75} fill="transparent" isAnimationActive={false} /></AreaChart></ResponsiveContainer></div></CardContent>
  </Card>;
}
export function CategoryChart({ data, total }: { data: { category: Category; count: number }[]; total: number }) {
  const t = useTranslations("admin"); const c = useTranslations("categories"); const rows = [...data].sort((a, b) => b.count - a.count);
  return <Card className="min-w-0"><CardHeader><CardTitle>{t("categoryDistribution")}</CardTitle><CardDescription className="mt-1.5 text-xs">{t("categoryDescription")}</CardDescription></CardHeader>{!total ? <EmptyState /> : <CardContent className="space-y-4 pb-6"><ol className="space-y-4">{rows.map((item, index) => <li key={item.category}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="leading-4">{c(item.category)}</span><span className="flex shrink-0 items-baseline gap-2 tabular-nums"><span className="font-medium">{item.count}</span><span className="w-9 text-right text-[10px] text-muted-foreground">{Math.round(item.count / total * 100)}%</span></span></div><div className="h-[5px] overflow-hidden rounded-xs bg-[#eef0e8]"><div className="h-full rounded-xs" style={{ width: `${item.count / total * 100}%`, backgroundColor: chartColors[index % chartColors.length] }} /></div></li>)}</ol></CardContent>}</Card>;
}
