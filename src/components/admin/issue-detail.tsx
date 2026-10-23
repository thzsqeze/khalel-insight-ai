"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Check, Clock3, GitBranch, ShieldCheck, Sparkles, Unlink2, Plus } from "lucide-react";
import { ApiError, requestJson, useRemote } from "@/lib/client-api";
import { categories, priorities, statuses, type Issue, type IssueDetail as IssueDetailData } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataError, DashboardSkeleton, EmptyState, PriorityBadge, StatusBadge } from "./shared";
import { ReportReview } from "./report-review";

function IssueSettings({ issue, onUpdate }: { issue: Issue; onUpdate: () => void }) {
  const t = useTranslations("admin"); const c = useTranslations("categories"); const s = useTranslations("statuses"); const p = useTranslations("priorities"); const errors = useTranslations("apiErrors");
  const [form, setForm] = useState({ title: issue.title, category: issue.category, status: issue.status, priority: issue.priority, owner: issue.owner ?? "", resolutionNote: issue.resolutionNote ?? "", publicSummary: issue.publicSummary ?? "", published: issue.published });
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [saved, setSaved] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setSaved(false); setError(null);
    try { await requestJson(`/api/admin/issues/${issue.id}`, { method: "PATCH", body: JSON.stringify({ ...form, owner: form.owner || null, resolutionNote: form.resolutionNote || null, publicSummary: form.publicSummary || null }) }); setSaved(true); onUpdate(); }
    catch (e) { setError(e instanceof ApiError && errors.has(e.code) ? errors(e.code) : t("error")); }
    finally { setBusy(false); }
  }
  return <Card><CardHeader><CardTitle>{t("issueSettings")}</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={save}>
    <div className="space-y-2"><Label htmlFor="issue-title">{t("issueTitleLabel")}</Label><Input id="issue-title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required minLength={5} maxLength={180} /></div>
    <div className="space-y-2"><Label htmlFor="issue-category">{t("category")}</Label><Select id="issue-category" className="w-full" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as Issue["category"] })}>{categories.map(item => <option value={item} key={item}>{c(item)}</option>)}</Select></div>
    <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="issue-status">{t("status")}</Label><Select id="issue-status" className="w-full" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Issue["status"] })}>{statuses.map(item => <option value={item} key={item}>{s(item)}</option>)}</Select></div><div className="space-y-2"><Label htmlFor="issue-priority">{t("priority")}</Label><Select id="issue-priority" className="w-full" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Issue["priority"] })}>{priorities.map(item => <option value={item} key={item}>{p(item)}</option>)}</Select></div></div>
    <div className="space-y-2"><Label htmlFor="issue-owner">{t("owner")}</Label><Input id="issue-owner" placeholder={t("ownerPlaceholder")} value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} maxLength={120} /></div>
    <div className="space-y-2"><Label htmlFor="issue-resolution">{t("resolutionNote")}</Label><Textarea id="issue-resolution" placeholder={t("resolutionPlaceholder")} value={form.resolutionNote} onChange={e => setForm({ ...form, resolutionNote: e.target.value })} required={form.status === "resolved"} maxLength={2000} className="min-h-24" /></div>
    <div className="space-y-4 border-t border-border pt-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-primary" />{t("publication")}</h3><div className="space-y-2"><Label htmlFor="issue-public-summary">{t("publicSummary")}</Label><Textarea id="issue-public-summary" value={form.publicSummary} onChange={e => setForm({ ...form, publicSummary: e.target.value })} minLength={10} maxLength={1000} required={form.published} className="min-h-24" /><p className="text-[10px] leading-relaxed text-muted-foreground">{t("publicSummaryHint")}</p></div><label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed"><input type="checkbox" className="mt-0.5 size-4 shrink-0" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })} />{t("publish")}</label></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}{saved && <p role="status" className="flex items-center gap-1.5 text-xs text-primary"><Check className="size-3" />{t("saved")}</p>}<Button className="w-full" type="submit" disabled={busy}>{busy ? t("saving") : t("save")}</Button>
  </form></CardContent></Card>;
}

export function IssueDetail({ id }: { id: string }) {
  const t = useTranslations("admin"); const locale = useLocale(); const c = useTranslations("categories"); const errors = useTranslations("apiErrors");
  const { data, error, reload } = useRemote<IssueDetailData>(`/api/admin/issues/${id}`);
  const [busy, setBusy] = useState<string | null>(null); const [actionError, setActionError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  async function membership(submissionId: string, action: "add" | "remove") {
    setBusy(submissionId); setActionError(null);
    try { await requestJson(`/api/admin/issues/${id}/members`, { method: "POST", body: JSON.stringify({ submissionId, action }) }); setConfirmRemove(null); reload(); }
    catch (e) { setActionError(e instanceof ApiError && errors.has(e.code) ? errors(e.code) : t("error")); }
    finally { setBusy(null); }
  }
  if (error) return <DataError error={error} retry={reload} />;
  if (!data) return <DashboardSkeleton />;
  const { issue } = data;
  return <div className="space-y-6"><Link href="/admin/issues" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"><ArrowLeft className="size-3.5" />{t("backToIssues")}</Link><div><div className="mb-3 flex flex-wrap items-center gap-2"><Badge variant="outline">{issue.reference}</Badge><StatusBadge status={issue.status} /><PriorityBadge priority={issue.priority} /></div><h1 className="max-w-3xl text-2xl font-semibold leading-snug tracking-tight sm:text-[28px]">{locale === "kk" && issue.titleKk ? issue.titleKk : issue.title}</h1><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"><span>{c(issue.category)}</span><span>{t("groupCount", { count: issue.count })}</span><span>{t("updated")}: {formatDate(issue.updatedAt, locale)}</span></div></div>
    {actionError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{actionError}</p>}
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]"><div className="space-y-6"><Card><CardHeader><CardTitle className="flex items-center gap-2"><GitBranch className="size-4 text-primary" />{t("linkedReports")}<Badge>{data.submissions.length}</Badge></CardTitle></CardHeader><CardContent className="space-y-6">{!data.submissions.length && <EmptyState />}{data.submissions.map((report, index) => <div key={report.id} className={index ? "border-t border-border pt-6" : ""}><ReportReview key={`${report.id}-${report.analysisStatus}-${report.analysis?.reviewed}`} report={report} onUpdate={reload} /><div className="mt-4 flex flex-wrap items-center gap-2">{confirmRemove === report.id ? <><p className="w-full text-xs text-muted-foreground">{t("confirmRemove")}</p><Button variant="destructive" size="sm" disabled={busy === report.id} onClick={() => membership(report.id, "remove")}>{t("removeReport")}</Button><Button variant="ghost" size="sm" onClick={() => setConfirmRemove(null)}>{t("cancel")}</Button></> : <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => setConfirmRemove(report.id)}><Unlink2 />{t("removeReport")}</Button>}</div></div>)}</CardContent></Card>
      <Card className="border-[#dcebe3] bg-[#f6faf8]"><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" />{t("similarTitle")}</CardTitle><p className="text-xs leading-relaxed text-muted-foreground">{t("similarDescription")}</p></CardHeader><CardContent className="space-y-3">{!data.similar.length && <p className="py-3 text-sm text-muted-foreground">{t("noSimilar")}</p>}{data.similar.map(({ submission, similarity }) => <div key={submission.id} className="rounded-lg border border-border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] text-muted-foreground">{submission.reference}</span><Badge variant="default">{t("similarity", { percent: Math.round(similarity * 100) })}</Badge></div><p className="my-3 text-sm leading-relaxed">{submission.description}</p><Button variant="outline" size="sm" disabled={busy !== null} onClick={() => membership(submission.id, "add")}><Plus />{t("addReport")}</Button></div>)}</CardContent></Card>
    </div><div className="space-y-6"><IssueSettings key={issue.id} issue={issue} onUpdate={reload} /><Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="size-4 text-slate-400" />{t("history")}</CardTitle></CardHeader><CardContent>{!data.events.length ? <p className="text-xs text-muted-foreground">{t("historyEmpty")}</p> : <ol className="space-y-0">{[...data.events].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((event, index) => <li key={event.id} className="relative pl-6 pb-6 last:pb-0">{index < data.events.length - 1 && <span className="absolute left-[4px] top-3 h-full w-px bg-border" />}<span className="absolute left-0 top-1.5 size-[9px] rounded-full border-2 border-white bg-primary ring-1 ring-emerald-100" /><p className="text-xs font-medium">{t(`status_${event.status}`)}</p><p className="mt-1 text-[10px] text-slate-400">{formatDate(event.createdAt, locale)}</p>{event.note && <p className="mt-2 break-words text-xs leading-relaxed text-muted-foreground">{event.note}</p>}</li>)}</ol>}</CardContent></Card></div></div>
  </div>;
}
