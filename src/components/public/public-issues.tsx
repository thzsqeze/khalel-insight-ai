"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, BookOpen, Building2, CheckCircle2, Clock3, FileText, Layers3, MessageSquare, Monitor, Search, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";
import { categories, statuses, type PublicIssue } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { DemoBadge } from "./public-shell";
import { PublicError, publicButtonClass, publicInputClass, publicOutlineClass, safeError, StatusPill } from "./public-shared";

const categoryIcons = { timetable: Clock3, education: BookOpen, infrastructure: Building2, digital_services: Monitor, communication: MessageSquare, administration: Users, other: FileText };

export function PublicIssues({ demo }: { demo: boolean }) {
  const t = useTranslations("progress");
  const c = useTranslations("commonPublic");
  const locale = useLocale();
  const [data, setData] = useState<PublicIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [serverDemo, setServerDemo] = useState(demo);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/issues", { signal: controller.signal, cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(safeError(payload.error));
        setData(payload.issues); setServerDemo(payload.demo);
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof TypeError ? "network" : cause instanceof Error ? safeError(cause.message) : "unknown"); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);
  const filtered = useMemo(() => data.filter(issue => (!category || issue.category === category) && (!status || issue.status === status) && (!query.trim() || `${issue.title} ${issue.titleKk ?? ""} ${issue.publicSummary}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))), [data, category, status, query]);
  const stats = [{ label: "all", value: data.length, icon: Layers3 }, { label: "active", value: data.filter(issue => issue.status === "under_review" || issue.status === "in_progress").length, icon: Clock3 }, { label: "resolved", value: data.filter(issue => issue.status === "resolved").length, icon: CheckCircle2 }];
  function retry() { setError(""); setLoading(true); setAttempt(value => value + 1); }
  function reset() { setQuery(""); setCategory(""); setStatus(""); }
  return <div className="mx-auto max-w-[1200px] px-5 py-11 sm:px-8 sm:py-16 lg:px-10">
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="mb-6 flex flex-wrap items-center gap-3"><span className="text-[10px] font-semibold tracking-[1.7px] text-primary">{t("eyebrow")}</span>{serverDemo && <DemoBadge />}</div><h1 className="whitespace-pre-line text-[36px] font-medium leading-[1.12] tracking-[-1.4px] text-[#203b35] sm:text-[46px]">{t("title")}</h1></div><p className="max-w-[400px] text-sm leading-7 text-slate-500">{t("description")}</p></div>
    {serverDemo && <p className="mt-7 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-xs leading-6 text-amber-800">{t("demoNote")}</p>}
    <div className="mt-8 grid gap-3 sm:grid-cols-3">{stats.map(({ label, value, icon: Icon }) => <div key={label} className="flex items-center gap-4 rounded-xl border border-border bg-white px-5 py-5"><span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", label === "resolved" ? "bg-teal-50 text-primary" : "bg-slate-50 text-slate-400")}><Icon className="size-5" strokeWidth={1.5} /></span><div><p className="text-[11px] text-slate-500">{t(label)}</p>{loading ? <div className="mt-2 h-7 w-10 animate-pulse rounded bg-slate-100" /> : <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-800">{error ? "—" : value}</p>}</div></div>)}</div>
    <div className="mt-8 flex flex-col gap-3 rounded-xl border border-border bg-white p-3 lg:flex-row"><div className="relative flex-1"><label htmlFor="issue-search" className="sr-only">{t("search")}</label><Search className="pointer-events-none absolute left-3.5 top-4 size-4 text-slate-400" /><input id="issue-search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} className={cn(publicInputClass, "border-slate-100 bg-slate-50/70 pl-10")} /></div><div className="grid grid-cols-2 gap-3 lg:flex"><label className="sr-only" htmlFor="issue-category">{t("categoryLabel")}</label><select id="issue-category" value={category} onChange={event => setCategory(event.target.value)} className={cn(publicInputClass, "text-xs lg:w-[210px]")}><option value="">{c("allCategories")}</option>{categories.map(value => <option key={value} value={value}>{c(`categories.${value}`)}</option>)}</select><label className="sr-only" htmlFor="issue-status">{t("statusLabel")}</label><select id="issue-status" value={status} onChange={event => setStatus(event.target.value)} className={cn(publicInputClass, "text-xs lg:w-[190px]")}><option value="">{c("allStatuses")}</option>{statuses.map(value => <option key={value} value={value}>{c(`statuses.${value}`)}</option>)}</select></div></div>
    <div aria-live="polite" aria-busy={loading} className="mt-6">
      {loading ? <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map(n => <div key={n} className="h-[230px] animate-pulse rounded-2xl border border-border bg-white p-6"><div className="h-9 w-9 rounded-xl bg-slate-100" /><div className="mt-5 h-4 w-3/4 rounded bg-slate-100" /><div className="mt-4 h-3 w-full rounded bg-slate-50" /><div className="mt-2 h-3 w-5/6 rounded bg-slate-50" /></div>)}<span className="sr-only">{c("loading")}</span></div> : error ? <div className="rounded-2xl border border-border bg-white p-8 text-center"><h2 className="mb-4 text-lg font-semibold text-slate-700">{t("errorTitle")}</h2><PublicError error={error} className="mx-auto max-w-md text-left" /><button className={cn(publicOutlineClass, "mt-5")} type="button" onClick={retry}>{c("retry")}</button></div> : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-14 text-center"><span className="mb-5 inline-grid size-12 place-items-center rounded-xl bg-slate-100 text-slate-400">{data.length ? <SlidersHorizontal className="size-5" /> : <Layers3 className="size-5" />}</span><h2 className="text-lg font-semibold text-slate-700">{t(data.length ? "noResultsTitle" : "emptyTitle")}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">{t(data.length ? "noResultsDescription" : "emptyDescription")}</p>{data.length > 0 && <button type="button" className={cn(publicOutlineClass, "mt-5")} onClick={reset}>{t("reset")}</button>}</div> : <><p className="mb-4 text-[11px] text-slate-400">{t("results", { count: filtered.length })}</p><div className="grid items-stretch gap-4 md:grid-cols-2">{filtered.map(issue => { const Icon = categoryIcons[issue.category]; return <article key={issue.id} className="flex flex-col rounded-2xl border border-border bg-white p-6"><div className="flex items-center justify-between gap-3"><span className="grid size-10 place-items-center rounded-xl bg-slate-50 text-slate-500"><Icon className="size-5" strokeWidth={1.5} /></span><StatusPill status={issue.status} /></div><p className="mt-5 text-[10px] text-slate-400">{c(`categories.${issue.category}`)}</p><h2 className="mt-2 text-base font-semibold leading-6 tracking-[-0.25px] text-slate-800">{locale === "kk" && issue.titleKk ? issue.titleKk : issue.title}</h2><p className="mt-3 flex-1 whitespace-pre-line break-words text-xs leading-7 text-slate-500">{issue.publicSummary}</p><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-[10px] text-slate-400"><span className="inline-flex items-center gap-1.5"><Users className="size-3.5" />{c("reports", { count: issue.count })}</span><time dateTime={issue.updatedAt}>{c("updated", { date: formatDate(issue.updatedAt, locale) })}</time></div></article>; })}</div></>}
    </div>
    <p className="mt-5 flex items-start gap-2 text-[11px] leading-6 text-slate-400"><ShieldCheck className="mt-1 size-3.5 shrink-0" />{t("privacy")}</p>
    <div className="mt-12 flex flex-col items-start justify-between gap-5 rounded-2xl border border-teal-100 bg-[#edf4ef] p-6 sm:flex-row sm:items-center sm:p-8"><div><h2 className="text-lg font-semibold tracking-[-0.4px] text-[#203b35]">{t("submitTitle")}</h2><p className="mt-2 text-xs leading-6 text-slate-500">{t("submitDescription")}</p></div><Link href="/submit" className={cn(publicButtonClass, "shrink-0 text-xs")}>{t("submitButton")}<ArrowUpRight className="size-4" /></Link></div>
  </div>;
}
