"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Goal, PanelsTopLeft, RefreshCw, Ticket, UsersRound } from "lucide-react";
import { useRemote } from "@/lib/client-api";
import type { TicketAnalytics } from "@/lib/ticket-analytics";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DataError, DashboardSkeleton, StatusBadge } from "./shared";
import {
  TicketActivityChart,
  TicketPriorityChart,
  TicketReplyChart,
} from "./ticket-analytics-charts";

const statusBorders = {
  new: "bg-[#5bd4b2]",
  under_review: "bg-[#dfbd74]",
  in_progress: "bg-[#ad92e5]",
  resolved: "bg-[#8fc69d]",
};

export function AnalyticsPage() {
  const t = useTranslations("ticketAnalytics");
  const locale = useLocale();
  const [days, setDays] = useState(30);
  const { data, error, loading, reload } = useRemote<TicketAnalytics>(
    `/api/admin/ticket-analytics?days=${days}`,
  );
  if (error) return <DataError error={error} retry={reload} />;
  if (!data) return <DashboardSkeleton />;
  const number = new Intl.NumberFormat(locale === "kk" ? "kk-KZ" : "ru-RU");
  const metrics = [
    { label: "allTickets", value: data.total, icon: UsersRound },
    { label: "visitorReplies", value: data.visitorReplies, icon: Ticket },
    { label: "staffReplies", value: data.staffReplies, icon: PanelsTopLeft },
    { label: "unanswered", value: data.unanswered, icon: Goal },
  ] as const;
  return (
    <div className="space-y-4 text-[#202322]">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-[11px] leading-5 text-[#8b918d]">
            {t("periodNote", { days: data.days })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            aria-label={t("period")}
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="h-9 border-[#e3e6e4] text-xs"
          >
            {[7, 30, 90].map((value) => (
              <option key={value} value={value}>
                {t("lastDays", { days: value })}
              </option>
            ))}
          </Select>
          <Button
            aria-label={t("refresh")}
            variant="outline"
            size="icon"
            className="size-9 border-[#e3e6e4]"
            disabled={loading}
            onClick={reload}
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <section
            key={metric.label}
            className="rounded-2xl border border-[#e2e5e3] bg-white px-5 py-4 shadow-[0_1px_2px_#00000002]"
          >
            <h2 className="text-xs font-medium leading-5 text-[#626863]">{t(metric.label)}</h2>
            <div className="mt-5 flex items-end justify-between gap-3">
              <p className="text-[29px] font-semibold leading-none tracking-tight text-[#171b18]">
                {number.format(metric.value)}
              </p>
              <metric.icon
                aria-hidden
                className="size-9 shrink-0 text-[#c9cdca]"
                strokeWidth={1.15}
              />
            </div>
          </section>
        ))}
      </div>
      <div className="grid min-w-0 items-stretch gap-4 xl:grid-cols-[1.85fr_1fr]">
        <TicketReplyChart data={data.trend} average={data.averageReplyMinutes} />
        <TicketPriorityChart priorities={data.priorities} total={data.active} />
      </div>
      <div className="grid min-w-0 items-stretch gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <TicketActivityChart data={data.trend} created={data.created} resolved={data.resolved} />
        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e2e5e3] bg-white">
          <header className="flex items-center justify-between gap-3 px-5 pb-4 pt-5">
            <h2 className="text-sm font-semibold">{t("recentTickets")}</h2>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-[#e0e4e1] text-[11px]"
            >
              <Link href="/admin/issues">
                {t("viewAll")}
                <ArrowUpRight />
              </Link>
            </Button>
          </header>
          {data.recent.length ? (
            <div className="px-3 pb-4">
              {data.recent.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/admin/tickets/${ticket.id}`}
                  className="group relative flex min-h-[65px] items-center gap-3 rounded-lg border border-transparent px-3 py-3 transition-colors hover:border-[#e2e6e3] hover:bg-[#fafcfb] sm:gap-4"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute bottom-2.5 left-0 top-2.5 w-1 rounded-full",
                      statusBorders[ticket.status],
                    )}
                  />
                  <time
                    dateTime={ticket.updatedAt}
                    className="hidden w-[66px] shrink-0 text-[11px] font-medium tabular-nums text-[#5c655e] sm:block"
                  >
                    {formatDate(ticket.updatedAt, locale)}
                  </time>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium leading-5 text-[#39473e]">
                      {ticket.subject}
                    </p>
                    <p className="mt-1 truncate text-[10px] text-[#939b95]">
                      {ticket.reference}
                      <span className="sm:hidden"> · {formatDate(ticket.updatedAt, locale)}</span>
                    </p>
                  </div>
                  <StatusBadge status={ticket.status} />
                  <ArrowUpRight className="hidden size-3.5 shrink-0 text-[#a2aba4] group-hover:text-primary sm:block" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex min-h-64 items-center justify-center px-8 text-center">
              <p className="max-w-xs text-xs leading-6 text-[#969f98]">{t("noRecent")}</p>
            </div>
          )}
        </section>
      </div>
      <p className="px-1 text-[10px] leading-5 text-[#929a94]">{t("dataNote")}</p>
    </div>
  );
}
