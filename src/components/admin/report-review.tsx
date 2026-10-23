"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles, CheckCheck, ShieldAlert, ArrowRight, RefreshCw, Plus, X } from "lucide-react";
import { categories, priorities, type Category, type Priority, type Submission } from "@/lib/types";
import { ApiError, requestJson } from "@/lib/client-api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function ReportReview({ report, onUpdate, allowCreate = false }: { report: Submission; onUpdate: () => void; allowCreate?: boolean }) {
  const t = useTranslations("admin"); const c = useTranslations("categories"); const p = useTranslations("priorities"); const errors = useTranslations("apiErrors"); const locale = useLocale(); const router = useRouter();
  const [category, setCategory] = useState<Category>(report.analysis?.category ?? report.category);
  const [urgency, setUrgency] = useState<Priority>(report.analysis?.urgency ?? "medium");
  const [summary, setSummary] = useState(report.analysis?.summary ?? "");
  const [title, setTitle] = useState(report.analysis?.summary.slice(0, 180) ?? "");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  async function mutate(path: string, body?: unknown) {
    setBusy(true); setError(null); setSuccess(false);
    try { await requestJson(path, { method: "POST", ...(body ? { body: JSON.stringify(body) } : {}) }); setSuccess(true); onUpdate(); }
    catch (e) { setError(e instanceof ApiError && errors.has(e.code) ? errors(e.code) : t("error")); }
    finally { setBusy(false); }
  }
  async function createIssue(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try { const result = await requestJson<{ id: string }>("/api/admin/issues", { method: "POST", body: JSON.stringify({ submissionId: report.id, title, category }) }); router.push(`/admin/issues/${result.id}`); }
    catch (e) { setError(e instanceof ApiError && errors.has(e.code) ? errors(e.code) : t("error")); setBusy(false); }
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{report.reference}</Badge><span className="text-[11px] text-muted-foreground">{t(report.role)} · {t("anonymous")}</span></div><span className="text-[11px] text-slate-400">{formatDate(report.createdAt, locale)}</span></div>
    <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t("reportText")}</p><p className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-4 text-sm leading-7 text-slate-600">{report.description}</p>{report.faculty && <p className="mt-2 text-xs text-muted-foreground">{t("faculty")}: {report.faculty}</p>}</div>
    <div className="rounded-xl border border-[#dfebe6] bg-[#f8fbf9] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-primary"><Sparkles className="size-4" />{report.analysis?.source === "demo" ? t("mockAnalysis") : t("analysis")}</h3>{report.analysis?.reviewed ? <Badge variant="default"><CheckCheck className="size-3" />{t("reviewed")}</Badge> : <Badge className="bg-amber-50 text-amber-700">{t("awaitingReview")}</Badge>}</div>
      {report.analysis ? <form onSubmit={e => { e.preventDefault(); void mutate(`/api/admin/submissions/${report.id}/review`, { category, summary, urgency }); }} className="space-y-4">
        <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] text-muted-foreground">{t("confidence", { percent: Math.round(report.analysis.confidence * 100) })}</span>{report.analysis.reviewNeeded && <Badge className="bg-amber-50 text-amber-700">{t("reviewRequired")}</Badge>}{report.analysis.sensitiveData && <Badge variant="destructive"><ShieldAlert className="size-3" />{t("sensitive")}</Badge>}</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor={`category-${report.id}`}>{t("category")}</Label><Select id={`category-${report.id}`} value={category} onChange={e => setCategory(e.target.value as Category)} className="w-full">{categories.map(item => <option key={item} value={item}>{c(item)}</option>)}</Select></div><div className="space-y-2"><Label htmlFor={`priority-${report.id}`}>{t("priority")}</Label><Select id={`priority-${report.id}`} value={urgency} onChange={e => setUrgency(e.target.value as Priority)} className="w-full">{priorities.map(item => <option key={item} value={item}>{p(item)}</option>)}</Select></div></div>
        <div className="space-y-2"><Label htmlFor={`summary-${report.id}`}>{t("summary")}</Label><Textarea id={`summary-${report.id}`} value={summary} onChange={e => setSummary(e.target.value)} required minLength={10} maxLength={1000} className="min-h-20 bg-white" /></div>
        {report.analysis.keywords.length > 0 && <div className="flex flex-wrap gap-1.5">{report.analysis.keywords.map((word, i) => <Badge key={`${word}-${i}`} variant="outline" className="bg-white text-[10px]">{word}</Badge>)}</div>}
        <p className="text-[10px] leading-relaxed text-muted-foreground">{t("reviewNotice")}</p><Button type="submit" size="sm" disabled={busy}><CheckCheck />{busy ? t("saving") : t("approve")}</Button>
      </form> : <div className="space-y-3"><p className="text-sm leading-relaxed text-muted-foreground">{t(report.analysisStatus === "failed" ? "analysisFailed" : report.analysisStatus === "skipped" ? "analysisSkipped" : "analysisPending")}</p>{!report.aiConsent && <p className="text-xs text-muted-foreground">{t("aiConsentNo")}</p>}{report.aiConsent && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => mutate(`/api/admin/submissions/${report.id}/analysis`)}><RefreshCw className={busy ? "animate-spin" : ""} />{t(report.analysisStatus === "failed" ? "rerunAnalysis" : "runAnalysis")}</Button>}</div>}
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
    {success && <p role="status" className="text-xs font-medium text-primary">{t("saved")}</p>}
    {allowCreate && !report.issueId && (!creating ? <Button variant="outline" size="sm" onClick={() => setCreating(true)}><Plus />{t("createIssue")}</Button> : <form onSubmit={createIssue} className="space-y-3 rounded-xl border border-border bg-white p-4"><div className="flex items-center justify-between gap-2"><Label htmlFor={`title-${report.id}`}>{t("issueTitleLabel")}</Label><Button type="button" size="icon" variant="ghost" aria-label={t("cancel")} onClick={() => setCreating(false)}><X /></Button></div><Input id={`title-${report.id}`} value={title} onChange={e => setTitle(e.target.value)} required minLength={5} maxLength={180} /><Select aria-label={t("category")} value={category} onChange={e => setCategory(e.target.value as Category)} className="w-full">{categories.map(item => <option key={item} value={item}>{c(item)}</option>)}</Select><p className="text-xs leading-relaxed text-muted-foreground">{t("createIssueHelp")}</p><Button size="sm" disabled={busy}>{t("create")}<ArrowRight /></Button></form>)}
  </div>;
}
