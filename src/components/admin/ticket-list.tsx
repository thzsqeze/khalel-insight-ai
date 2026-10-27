"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowDown,
  ArrowUpRight,
  CheckCheck,
  Inbox,
  Layers3,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useRemote } from "@/lib/client-api";
import { statuses, type Status } from "@/lib/types";
import type { TicketQueue } from "@/lib/tickets";
import { cn, formatDate } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataError, DashboardSkeleton, PriorityBadge, StatusBadge } from "./shared";
import { TicketDrawer } from "./ticket-drawer";

export function TicketList() {
  const t = useTranslations("tickets");
  const c = useTranslations("categories");
  const s = useTranslations("statuses");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const requestedTicket = searchParams.get("ticket") ?? searchParams.get("report");
  const selectedTicket =
    requestedTicket &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedTicket)
      ? requestedTicket
      : null;
  const { data, error, loading, reload } = useRemote<TicketQueue>("/api/admin/tickets");
  const [tab, setTab] = useState<"open" | "all" | "resolved">("open");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const [department, setDepartment] = useState("all");
  const [oldest, setOldest] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const filtersButtonRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    if (!selectedTicket || window.history.state?.ticketDrawerParent) return;
    // Direct links need a queue entry too, so Back first closes the drawer and
    // goes through its draft check instead of tearing down the whole workspace.
    const ticketUrl = window.location.href;
    const queueUrl = new URL(ticketUrl);
    queueUrl.searchParams.delete("ticket");
    queueUrl.searchParams.delete("report");
    const index = Number(window.history.state?.ticketDrawerIndex ?? 0);
    window.history.replaceState(
      { ...window.history.state, ticketDrawerIndex: index },
      "",
      queueUrl,
    );
    window.history.pushState(
      { ticketDrawerIndex: index + 1, ticketDrawerParent: true },
      "",
      ticketUrl,
    );
  }, [selectedTicket]);
  useEffect(() => {
    if (!filtersOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !filtersRef.current?.contains(event.target))
        setFiltersOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFiltersOpen(false);
        filtersButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [filtersOpen]);
  function ticketHref(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("report");
    params.set("ticket", id);
    return `/admin/issues?${params.toString()}`;
  }
  function openTicket(id: string) {
    const index = Number(window.history.state?.ticketDrawerIndex ?? 0);
    window.history.replaceState({ ...window.history.state, ticketDrawerIndex: index }, "");
    window.history.pushState(
      { ticketDrawerIndex: index + 1, ticketDrawerParent: true },
      "",
      ticketHref(id),
    );
  }
  function closeTicket() {
    if (window.history.state?.ticketDrawerParent) {
      window.history.back();
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.delete("ticket");
    params.delete("report");
    const query = params.toString();
    window.history.replaceState(
      { ticketDrawerIndex: 0 },
      "",
      `/admin/issues${query ? `?${query}` : ""}`,
    );
  }
  const drawer = <TicketDrawer id={selectedTicket} onClose={closeTicket} onUpdate={reload} />;
  if (error)
    return (
      <>
        <DataError error={error} retry={reload} />
        {drawer}
      </>
    );
  if (!data)
    return (
      <>
        <DashboardSkeleton />
        {drawer}
      </>
    );
  const open = data.tickets.filter((ticket) => ticket.status !== "resolved");
  const counts = {
    open: open.length,
    all: data.tickets.length,
    resolved: data.tickets.length - open.length,
  };
  const filtered = data.tickets
    .filter((ticket) => {
      if (tab === "open" && ticket.status === "resolved") return false;
      if (tab === "resolved" && ticket.status !== "resolved") return false;
      if (status !== "all" && ticket.status !== status) return false;
      if (department === "unassigned" && ticket.departmentId) return false;
      if (department !== "all" && department !== "unassigned" && ticket.departmentId !== department)
        return false;
      return `${ticket.reference} ${ticket.description} ${ticket.analysis?.summary ?? ""} ${c(ticket.category)}`
        .toLocaleLowerCase(locale)
        .includes(query.trim().toLocaleLowerCase(locale));
    })
    .sort((a, b) =>
      oldest ? a.updatedAt.localeCompare(b.updatedAt) : b.updatedAt.localeCompare(a.updatedAt),
    );
  const filterCount = Number(status !== "all") + Number(department !== "all");
  const hasFilters = query !== "" || filterCount > 0;
  const departmentName = (id: string | null) =>
    data.departments.find((item) => item.id === id)?.name ?? t("unassigned");
  function resetFilters() {
    setQuery("");
    setStatus("all");
    setDepartment("all");
  }
  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#78857e]">
              <span className="size-1.5 rounded-full bg-primary" />
              {t("workspaceEyebrow")}
            </p>
            <h1 className="text-[28px] font-semibold tracking-tight text-[#213b30]">
              {t("title")}
            </h1>
            <p className="mt-2 max-w-xl text-[13px] leading-6 text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button asChild variant="outline" size="sm" className="h-9">
              <Link href="/admin/issues?tab=groups">
                <Layers3 />
                {t("groups")}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              onClick={reload}
              disabled={loading}
              aria-label={t("refresh")}
            >
              <RefreshCw className={loading ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>
        <section
          className="rounded-xl border border-[#e1e7e2] bg-white shadow-[0_2px_8px_#1b3e2f03]"
          aria-label={t("queue")}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#e8ede9] px-4 sm:px-6">
            <div
              className="flex min-w-0 gap-5 overflow-x-auto sm:gap-7"
              role="tablist"
              aria-label={t("queue")}
            >
              {(["open", "all", "resolved"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => {
                    setTab(key);
                    setStatus("all");
                  }}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 border-b-2 py-5 text-xs font-medium transition-colors",
                    tab === key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(key)}
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] tabular-nums",
                      tab === key ? "bg-[#eaf2ed] text-primary" : "bg-[#f3f5f3] text-[#808780]",
                    )}
                  >
                    {counts[key]}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="relative flex flex-wrap items-center gap-2.5 px-4 py-4 sm:px-6">
            <div className="relative min-w-[200px] flex-1 sm:max-w-[380px]">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-[#8b958d]" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("search")}
                aria-label={t("search")}
                className="h-9 border-[#e1e7e2] bg-[#fcfdfc] pl-9 text-xs"
              />
            </div>
            <div
              ref={filtersRef}
              className="sm:relative"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                  setFiltersOpen(false);
              }}
            >
              <button
                ref={filtersButtonRef}
                id="ticket-filters-toggle"
                type="button"
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: cn(
                    "h-9 border-[#e1e7e2] text-xs",
                    filterCount > 0 && "border-primary/30 bg-[#f1f6f2] text-primary",
                  ),
                })}
                aria-expanded={filtersOpen}
                aria-controls="ticket-filters-panel"
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <SlidersHorizontal />
                {t("filters")}
                {filterCount > 0 && (
                  <span className="grid min-w-4 place-items-center rounded bg-primary px-1 text-[10px] text-white">
                    {filterCount}
                  </span>
                )}
              </button>
              {filtersOpen && (
                <div
                  id="ticket-filters-panel"
                  role="group"
                  aria-labelledby="ticket-filters-toggle"
                  className="absolute left-4 right-4 top-[calc(100%-4px)] z-20 space-y-4 sm:left-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-72 rounded-xl border border-[#dfe6e0] bg-white p-4 shadow-[0_12px_32px_#173a261a]"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#34483b]">{t("filters")}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      aria-label={t("closeFilters")}
                      onClick={() => {
                        setFiltersOpen(false);
                        filtersButtonRef.current?.focus();
                      }}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    {t("status")}
                    <Select
                      value={status}
                      aria-label={t("status")}
                      onChange={(event) => setStatus(event.target.value as Status | "all")}
                      className="mt-1.5 h-9 w-full border-[#e1e7e2] text-xs"
                    >
                      <option value="all">{t("allStatuses")}</option>
                      {statuses
                        .filter(
                          (item) =>
                            tab === "all" ||
                            (tab === "resolved" ? item === "resolved" : item !== "resolved"),
                        )
                        .map((item) => (
                          <option key={item} value={item}>
                            {s(item)}
                          </option>
                        ))}
                    </Select>
                  </label>
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    {t("department")}
                    <Select
                      value={department}
                      aria-label={t("department")}
                      onChange={(event) => setDepartment(event.target.value)}
                      className="mt-1.5 h-9 w-full border-[#e1e7e2] text-xs"
                    >
                      <option value="all">{t("allDepartments")}</option>
                      <option value="unassigned">{t("unassigned")}</option>
                      {data.departments.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <div className="flex items-center justify-between gap-2 border-t border-[#edf0ed] pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-[11px]"
                      disabled={filterCount === 0}
                      onClick={() => {
                        setStatus("all");
                        setDepartment("all");
                      }}
                    >
                      {t("resetFilters")}
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-[11px]"
                      onClick={() => {
                        setFiltersOpen(false);
                        filtersButtonRef.current?.focus();
                      }}
                    >
                      {t("filtersDone")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-9 text-[11px]"
              onClick={() => setOldest(!oldest)}
            >
              <ArrowDown className={oldest ? "rotate-180" : ""} />
              {t(oldest ? "oldestFirst" : "newestFirst")}
            </Button>
          </div>
          {!filtered.length ? (
            <div className="flex flex-col items-center px-6 py-20 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#f1f5f2] text-[#729180]">
                {hasFilters ? (
                  <SlidersHorizontal className="size-5" />
                ) : tab === "resolved" ? (
                  <CheckCheck className="size-5" />
                ) : (
                  <Inbox className="size-5" />
                )}
              </div>
              <h2 className="text-sm font-medium">{t(hasFilters ? "noResults" : "empty")}</h2>
              <p className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
                {t(hasFilters ? "noResultsBody" : "emptyBody")}
              </p>
              {hasFilters && (
                <Button className="mt-4" variant="outline" size="sm" onClick={resetFilters}>
                  {t("resetFilters")}
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left">
                  <thead className="border-y border-[#e8ede9] bg-[#f8faf8] text-[10px] font-medium text-[#849087]">
                    <tr>
                      {["reference", "subject", "status", "department", "updated"].map((key) => (
                        <th
                          key={key}
                          className="whitespace-nowrap px-5 py-3 font-medium first:pl-6"
                        >
                          {t(key)}
                        </th>
                      ))}
                      <th className="w-10 pr-4">
                        <span className="sr-only">{t("openTicket")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0ed]">
                    {filtered.map((ticket) => (
                      <tr key={ticket.id} className="group transition-colors hover:bg-[#fafcfb]">
                        <td className="whitespace-nowrap py-5 pl-6 pr-5 align-top">
                          <Link
                            href={ticketHref(ticket.id)}
                            onNavigate={(event) => {
                              event.preventDefault();
                              openTicket(ticket.id);
                            }}
                            className="text-[11px] font-medium tabular-nums text-[#7c8b81] hover:text-primary"
                          >
                            {ticket.reference}
                          </Link>
                        </td>
                        <td className="min-w-60 max-w-[440px] px-5 py-4">
                          <Link
                            href={ticketHref(ticket.id)}
                            onNavigate={(event) => {
                              event.preventDefault();
                              openTicket(ticket.id);
                            }}
                            className="block"
                          >
                            <span className="line-clamp-2 text-[13px] font-medium leading-[1.6] text-[#34483b] group-hover:text-primary">
                              {ticket.analysis?.summary || ticket.description}
                            </span>
                            <span className="mt-1.5 flex items-center gap-2 text-[10px] text-[#8b958d]">
                              {c(ticket.category)}
                              <span aria-hidden>·</span>
                              <PriorityBadge priority={ticket.priority} />
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={ticket.status} />
                        </td>
                        <td className="max-w-44 px-5 py-4 text-[11px] leading-5 text-[#738078]">
                          {departmentName(ticket.departmentId)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-[11px] tabular-nums text-[#849087]">
                          {formatDate(ticket.updatedAt, locale)}
                        </td>
                        <td className="pr-4">
                          <Link
                            href={ticketHref(ticket.id)}
                            onNavigate={(event) => {
                              event.preventDefault();
                              openTicket(ticket.id);
                            }}
                            aria-label={`${t("openTicket")}: ${ticket.reference}`}
                            className="inline-flex rounded-md p-2 text-[#9eaaa1] hover:bg-[#eef4ef] hover:text-primary"
                          >
                            <ArrowUpRight className="size-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-[#edf0ed] border-t border-[#e8ede9] md:hidden">
                {filtered.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={ticketHref(ticket.id)}
                    onNavigate={(event) => {
                      event.preventDefault();
                      openTicket(ticket.id);
                    }}
                    className="block space-y-3 p-5 hover:bg-[#fafcfb]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {ticket.reference}
                      </span>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <p className="line-clamp-2 text-[13px] font-medium leading-6">
                      {ticket.analysis?.summary || ticket.description}
                    </p>
                    <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                      <span>{departmentName(ticket.departmentId)}</span>
                      <time dateTime={ticket.updatedAt} className="shrink-0">
                        {formatDate(ticket.updatedAt, locale)}
                      </time>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-[#e8ede9] px-6 py-4 text-[10px] text-[#8b958d]">
            <span>{t("results", { count: filtered.length, total: data.tickets.length })}</span>
            <span>{t("sortedByUpdate")}</span>
          </div>
        </section>
      </div>
      {drawer}
    </>
  );
}
