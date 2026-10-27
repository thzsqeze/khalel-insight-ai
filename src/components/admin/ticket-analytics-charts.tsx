"use client";

import Link from "next/link";
import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Clock3 } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TicketAnalytics } from "@/lib/ticket-analytics";
import type { Priority } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const colors: Record<Priority, string> = {
  low: "#a07bd4",
  medium: "#30b586",
  high: "#11a5ee",
  critical: "#ffc26a",
};
const tooltipStyle = {
  border: "0",
  borderRadius: 7,
  background: "#171b18",
  color: "#ffffff",
  fontSize: 11,
  boxShadow: "0 4px 12px #00000018",
};

export function TicketReplyChart({
  data,
  average,
}: {
  data: TicketAnalytics["trend"];
  average: number | null;
}) {
  const t = useTranslations("ticketAnalytics");
  const locale = useLocale();
  const gradientId = useId().replace(/:/g, "");
  const hasReplies = data.some((point) => point.replyMinutes !== null);
  const value =
    average === null
      ? "—"
      : new Intl.NumberFormat(locale === "kk" ? "kk-KZ" : "ru-RU", {
          maximumFractionDigits: 1,
        }).format(average);
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e2e5e3] bg-white">
      <header className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h2 className="text-sm font-semibold">{t("replyTime")}</h2>
          <p className="mt-2 text-[30px] font-semibold leading-none tracking-tight text-[#252b27]">
            {value}
            <span className="ml-2 text-xs font-normal tracking-normal text-[#929b94]">
              {t("minutes")}
            </span>
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] text-[#a0a7a2]">
          <Clock3 className="size-3" />
          {t("firstReply")}
        </span>
      </header>
      <div
        className="relative mt-4 h-[190px] px-3 pb-3"
        role="img"
        aria-label={t(hasReplies ? "replyChartDescription" : "noReplyData")}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={data} margin={{ top: 15, right: 8, bottom: 4, left: 8 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b8e6bc" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#eaf8ec" stopOpacity={0.06} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#f0f3f0" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#a3aaa5", fontSize: 9 }}
              minTickGap={55}
              tickFormatter={(date: string) => formatDate(`${date}T12:00:00Z`, locale)}
              dy={7}
            />
            <YAxis hide domain={[0, "auto"]} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: "#aeb8b0", fontSize: 10, marginBottom: 4 }}
              itemStyle={{ color: "white", fontSize: 11 }}
              labelFormatter={(date) => formatDate(`${String(date)}T12:00:00Z`, locale)}
              formatter={(minutes) => [
                `${Number(minutes).toLocaleString(locale, { maximumFractionDigits: 1 })} ${t("minutes")}`,
                t("replyTime"),
              ]}
              cursor={{ stroke: "#c7d9ca", strokeDasharray: "3 3" }}
            />
            <Area
              type="monotone"
              dataKey="replyMinutes"
              name={t("replyTime")}
              stroke="#2bb780"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              connectNulls={false}
              dot={{ r: 2.5, fill: "#2bb780", stroke: "white", strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: "#30b943", stroke: "white", strokeWidth: 2.5 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
        {!hasReplies && (
          <div className="pointer-events-none absolute inset-x-6 inset-y-5 flex items-center justify-center">
            <p className="max-w-sm rounded-lg bg-white/90 px-5 py-4 text-center text-xs leading-6 text-[#9ba49d]">
              {t("noReplyData")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export function TicketPriorityChart({
  priorities,
  total,
}: {
  priorities: TicketAnalytics["priorities"];
  total: number;
}) {
  const t = useTranslations("ticketAnalytics");
  const p = useTranslations("priorities");
  const locale = useLocale();
  const nonempty = priorities.filter((item) => item.count > 0);
  const segments = nonempty.map((item, index) => {
    const length = total ? (item.count / total) * 100 : 0;
    const segment = {
      ...item,
      start: total
        ? (nonempty.slice(0, index).reduce((sum, previous) => sum + previous.count, 0) / total) *
          100
        : 0,
      length: Math.max(length - (nonempty.length > 1 ? Math.min(3, length / 4) : 0), 0),
    };
    return segment;
  });
  return (
    <section className="min-w-0 rounded-2xl border border-[#e2e5e3] bg-white px-5 pb-5 pt-5">
      <h2 className="text-sm font-semibold">{t("ticketPriority")}</h2>
      <div className="relative mx-auto mt-5 max-w-[270px]">
        <svg
          viewBox="0 0 212 120"
          className="w-full"
          role="img"
          aria-label={t("priorityDescription", { count: total })}
        >
          <path
            d="M 18 106 A 88 88 0 0 1 194 106"
            pathLength="100"
            fill="none"
            stroke="#f0f3f0"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {segments.map((segment) => (
            <path
              key={segment.priority}
              d="M 18 106 A 88 88 0 0 1 194 106"
              pathLength="100"
              fill="none"
              stroke={colors[segment.priority]}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${segment.length} ${100 - segment.length}`}
              strokeDashoffset={-segment.start}
            />
          ))}
        </svg>
        <div className="absolute inset-x-0 bottom-1 text-center">
          <p className="text-[10px] text-[#969d97]">{t("activeTickets")}</p>
          <p className="mt-2 text-[25px] font-semibold leading-none tracking-tight text-[#222a24]">
            {new Intl.NumberFormat(locale).format(total)}
          </p>
        </div>
      </div>
      <dl className="mx-auto mt-5 grid max-w-[300px] grid-cols-2 gap-x-5 gap-y-3">
        {priorities.map((item) => (
          <div
            key={item.priority}
            className="flex min-w-0 items-center justify-between gap-2 text-[10px]"
          >
            <dt className="flex items-center gap-2 text-[#7f8b82]">
              <span
                className="size-2 shrink-0 rounded-[2px]"
                style={{ background: colors[item.priority] }}
              />
              {p(item.priority)}
            </dt>
            <dd className="font-medium tabular-nums text-[#65756a]">{item.count}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function TicketActivityChart({
  data,
  created,
  resolved,
}: {
  data: TicketAnalytics["trend"];
  created: number;
  resolved: number;
}) {
  const t = useTranslations("ticketAnalytics");
  const locale = useLocale();
  const hasActivity = data.some((point) => point.created > 0 || point.resolved > 0);
  return (
    <section className="min-w-0 rounded-2xl border border-[#e2e5e3] bg-white">
      <header className="flex items-center justify-between gap-3 px-5 pb-4 pt-5">
        <h2 className="text-sm font-semibold">{t("ticketActivity")}</h2>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 rounded-lg border-[#e0e4e1] text-[11px]"
        >
          <Link href="/admin/issues">
            {t("openQueue")}
            <ArrowUpRight />
          </Link>
        </Button>
      </header>
      <dl className="mb-5 grid grid-cols-2 gap-4 px-5">
        {[
          { label: "resolved", value: resolved, color: "#2eb583" },
          { label: "created", value: created, color: "#cee5ce" },
        ].map((item) => (
          <div key={item.label}>
            <dt className="flex items-center gap-2 text-[11px] text-[#89938b]">
              <span className="size-2 shrink-0 rounded-[2px]" style={{ background: item.color }} />
              {t(item.label)}
            </dt>
            <dd className="mt-2 pl-4 text-[25px] font-semibold leading-none tracking-tight text-[#242c26]">
              {new Intl.NumberFormat(locale).format(item.value)}
            </dd>
          </div>
        ))}
      </dl>
      <div
        className="relative h-[275px] px-3 pb-5"
        role="img"
        aria-label={t(hasActivity ? "activityDescription" : "noActivity")}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 5 }} barGap="-100%">
            <CartesianGrid vertical={false} stroke="#edf1ed" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#929b94", fontSize: 9 }}
              minTickGap={32}
              tickFormatter={(date: string) => formatDate(`${date}T12:00:00Z`, locale)}
              dy={8}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#929b94", fontSize: 10 }}
              width={27}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: "#aeb8b0", fontSize: 10, marginBottom: 4 }}
              itemStyle={{ color: "white", fontSize: 11 }}
              labelFormatter={(date) => formatDate(`${String(date)}T12:00:00Z`, locale)}
              cursor={{ fill: "#f3f7f3" }}
            />
            <Bar
              dataKey="created"
              name={t("created")}
              fill="#cee5ce"
              radius={[4, 4, 0, 0]}
              maxBarSize={38}
              isAnimationActive={false}
            />
            <Bar
              dataKey="resolved"
              name={t("resolved")}
              fill="#2eb583"
              radius={[4, 4, 0, 0]}
              maxBarSize={38}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
        {!hasActivity && (
          <div className="pointer-events-none absolute inset-x-10 inset-y-8 flex items-center justify-center">
            <p className="max-w-xs rounded-lg bg-white/90 px-5 py-4 text-center text-xs leading-6 text-[#9ba49d]">
              {t("noActivity")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
