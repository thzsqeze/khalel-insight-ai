"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Check, ChevronRight, CircleHelp, LockKeyhole, Search, ShieldCheck } from "lucide-react";
import { statuses, type TrackingResult } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { DemoBadge } from "./public-shell";
import { postPublic, PublicError, publicButtonClass, publicInputClass, publicLabelClass, Spinner, StatusPill } from "./public-shared";

export function Tracking({ demo }: { demo: boolean }) {
  const t = useTranslations("track");
  const c = useTranslations("commonPublic");
  const locale = useLocale();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validation, setValidation] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  async function lookup(event: React.FormEvent) {
    event.preventDefault();
    setError(""); setResult(null);
    if (!code.trim()) { setValidation(true); inputRef.current?.focus(); return; }
    setValidation(false); setLoading(true);
    try { setResult(await postPublic<TrackingResult>("/api/track", { code: code.trim() })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "unknown"); }
    finally { setLoading(false); }
  }
  return <div className="mx-auto max-w-[1100px] px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
    <div className="grid gap-10 lg:grid-cols-[0.95fr_1.1fr] lg:gap-16">
      <div><div className="mb-6 flex flex-wrap items-center gap-3"><span className="text-[10px] font-semibold tracking-[1.7px] text-primary">{t("eyebrow")}</span>{demo && <DemoBadge />}</div><h1 className="whitespace-pre-line text-[36px] font-medium leading-[1.15] tracking-[-1.4px] text-[#203b35] sm:text-[43px]">{t("title")}</h1><p className="mt-5 max-w-sm text-sm leading-7 text-slate-500">{t("description")}</p><div className="mt-9 hidden max-w-sm items-center gap-3 rounded-xl border border-teal-100 bg-teal-50/50 p-4 text-xs leading-6 text-slate-500 lg:flex"><ShieldCheck className="size-7 shrink-0 text-primary" />{t("confidential")}</div></div>
      <div>
        <div className="rounded-2xl border border-border bg-white p-6 shadow-[0_8px_25px_-20px_#0e453b50] sm:p-8"><span className="mb-6 grid size-11 place-items-center rounded-xl bg-teal-50 text-primary"><Search className="size-5" strokeWidth={1.5} /></span><form onSubmit={lookup} noValidate><label htmlFor="tracking-code" className={publicLabelClass}>{t("codeLabel")}</label><input ref={inputRef} id="tracking-code" value={code} onChange={e => setCode(e.target.value)} placeholder={t("codePlaceholder")} className={cn(publicInputClass, "font-mono text-[13px]")} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={100} aria-invalid={validation} aria-describedby={validation ? "tracking-validation" : "tracking-privacy"} />{validation && <p id="tracking-validation" role="alert" className="mt-2 text-xs text-red-700">{t("validation")}</p>}{error && <PublicError error={error} className="mt-4" />}<button disabled={loading} className={cn(publicButtonClass, "mt-5 w-full")} type="submit">{loading ? <Spinner /> : <Search className="size-4" />}{t(loading ? "checking" : "button")}</button><p id="tracking-privacy" className="mt-4 flex items-start gap-2 text-[10px] leading-5 text-slate-400"><LockKeyhole className="mt-1 size-3 shrink-0" />{t("privacyNote")}</p></form></div>
        {!result && <details className="group mt-5 rounded-xl border border-border bg-white/50 p-4"><summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-slate-600"><CircleHelp className="size-4 text-slate-400" />{t("lostTitle")}<ChevronRight className="ml-auto size-4 transition group-open:rotate-90" /></summary><p className="mt-3 text-xs leading-6 text-slate-500">{t("lostDescription")}</p><Link className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary" href="/submit">{t("newReport")}<ArrowRight className="size-3.5" /></Link></details>}
      </div>
    </div>
    <div aria-live="polite" aria-busy={loading}>
      {result && <section className="mt-12 rounded-2xl border border-teal-200 bg-white p-6 shadow-[0_10px_35px_-25px_#17443840] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs text-slate-400">{t("received", { date: formatDate(result.createdAt, locale) })}</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.5px] text-slate-800">{t("resultTitle", { reference: result.reference })}</h2><p className="mt-2 text-xs text-slate-500">{c(`categories.${result.category}`)}</p></div><StatusPill status={result.status} /></div>
        <h3 className="mt-8 text-xs font-semibold text-slate-700">{t("timeline")}</h3><ol className="mt-5 grid gap-4 sm:grid-cols-4 sm:gap-0">{statuses.map((status, index) => { const currentIndex = statuses.indexOf(result.status); const complete = index < currentIndex; const current = index === currentIndex; return <li key={status} aria-current={current ? "step" : undefined} className="relative flex items-center gap-3 sm:block"><div className="flex items-center"><span className={cn("relative z-10 grid size-8 shrink-0 place-items-center rounded-full border text-xs font-semibold", complete || current ? "border-primary bg-primary text-white" : "border-slate-200 bg-slate-50 text-slate-400")}>{complete ? <Check className="size-4" /> : index + 1}</span>{index !== statuses.length - 1 && <span className={cn("hidden h-px w-full sm:block", complete ? "bg-primary" : "bg-slate-200")} />}</div><div className="sm:mt-3 sm:pr-3"><p className={cn("text-xs", current ? "font-semibold text-primary" : complete ? "text-slate-700" : "text-slate-400")}>{c(`statuses.${status}`)}</p>{current && <p className="mt-1 text-[10px] text-slate-400">{t("current")}</p>}</div></li>; })}</ol>
        <div className="mt-7 rounded-xl bg-teal-50/60 px-4 py-3 text-xs leading-6 text-primary">{t(`statusDescriptions.${result.status}`)}</div>
        {result.events.length > 0 ? <div className="mt-7 border-t border-border pt-6"><h3 className="mb-4 text-xs font-semibold text-slate-700">{t("history")}</h3><ol className="space-y-3">{result.events.map((event, index) => <li key={`${event.createdAt}-${index}`} className="flex items-center gap-3 text-xs"><span className="size-1.5 rounded-full bg-teal-400" /><span className="text-slate-600">{c(`statuses.${event.status}`)}</span><time dateTime={event.createdAt} className="ml-auto text-slate-400">{formatDate(event.createdAt, locale)}</time></li>)}</ol></div> : <p className="mt-5 text-xs leading-6 text-slate-500">{t("noUpdates")}</p>}
        <p className="mt-7 flex items-start gap-2 border-t border-border pt-5 text-[11px] leading-6 text-slate-400"><LockKeyhole className="mt-1 size-3.5 shrink-0" />{t("confidential")}</p>
      </section>}
    </div>
  </div>;
}
