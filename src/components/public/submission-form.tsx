"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCircle2, Copy, Download, GraduationCap, LockKeyhole, Send, ShieldCheck } from "lucide-react";
import { categories, type Locale, type Submission } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DemoBadge } from "./public-shell";
import { postPublic, PublicError, publicButtonClass, publicInputClass, publicLabelClass, publicOutlineClass, Spinner } from "./public-shared";

type Receipt = { trackingCode: string; reference: string; analysisStatus: Submission["analysisStatus"] };

function SubmissionReceipt({ receipt }: { receipt: Receipt }) {
  const t = useTranslations("submit");
  const inputRef = useRef<HTMLInputElement>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "fallback">("idle");
  async function copy() {
    try { await navigator.clipboard.writeText(receipt.trackingCode); setCopyState("copied"); }
    catch { inputRef.current?.focus(); inputRef.current?.select(); setCopyState("fallback"); }
  }
  function download() {
    const content = `${t("receiptTitle")}\n\n${t("receiptReference")}: ${receipt.reference}\n${t("receiptCode")}: ${receipt.trackingCode}\n\n${t("receiptWarning")}\n${window.location.origin}/track\n`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `univoice-${receipt.reference}.txt`; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="mx-auto max-w-[760px] px-5 py-14 sm:px-8 sm:py-20">
    <div className="text-center"><span className="mb-6 inline-grid size-16 place-items-center rounded-sm border border-[#d1d8c9] bg-[#eaf0e3] text-primary"><CheckCircle2 className="size-8" strokeWidth={1.5} /></span><p className="text-[10px] font-semibold tracking-[1.6px] text-primary">{t("successEyebrow")}</p><h1 className="mt-4 text-3xl font-medium tracking-[-1px] text-foreground sm:text-4xl">{t("successTitle")}</h1><p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground">{t("successDescription", { reference: receipt.reference })}</p></div>
    <div className="mt-9 rounded-sm border border-[#c3cbb9] bg-[#fffefa] p-6 sm:p-8">
      <label htmlFor="receipt-code" className="mb-3 block text-sm font-semibold text-foreground">{t("codeLabel")}</label><input id="receipt-code" ref={inputRef} readOnly value={receipt.trackingCode} onClick={e => e.currentTarget.select()} className="w-full rounded-sm border border-dashed border-[#b3c1aa] bg-[#eaf0e3]/50 px-3 py-4 text-center font-mono text-sm font-semibold tracking-wide text-primary outline-none focus:ring-2 focus:ring-primary/30 sm:text-lg" spellCheck={false} />
      <p className="mt-4 text-[13px] leading-6 text-amber-800">{t("saveWarning")}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={copy} className={cn(publicButtonClass, "flex-1")}>{copyState === "copied" ? <Check className="size-4" /> : <Copy className="size-4" />}{t(copyState === "copied" ? "copied" : "copy")}</button><button type="button" onClick={download} className={cn(publicOutlineClass, "flex-1")}><Download className="size-4" />{t("download")}</button></div>
      <p role="status" aria-live="polite" className="mt-2 text-xs text-primary">{copyState === "fallback" ? t("copyFallback") : copyState === "copied" ? t("copied") : ""}</p>
      <p className="mt-4 flex items-start gap-2 border-t border-border pt-5 text-xs leading-6 text-muted-foreground"><LockKeyhole className="mt-1 size-3.5 shrink-0" />{t("tokenPrivacy")}</p>
    </div>
    {receipt.analysisStatus !== "completed" && <p className="mt-5 text-center text-xs leading-6 text-muted-foreground">{t(receipt.analysisStatus === "pending" ? "analysisPending" : receipt.analysisStatus === "failed" ? "analysisFailed" : "analysisSkipped")}</p>}
    <div className="mt-7 flex flex-wrap items-center justify-center gap-5"><Link href="/track" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">{t("trackButton")}<ArrowRight className="size-4" /></Link><Link href="/" className="text-sm text-muted-foreground hover:text-primary">{t("homeButton")}</Link></div>
  </div>;
}

export function SubmissionForm({ demo }: { demo: boolean }) {
  const t = useTranslations("submit");
  const c = useTranslations("commonPublic");
  const locale = useLocale() as Locale;
  const [step, setStep] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const schema = z.object({
    role: z.enum(["student", "teacher"], { error: t("validationRole") }),
    category: z.enum(categories, { error: t("validationCategory") }),
    description: z.string().trim().min(20, t("validationDescriptionMin")).max(5000, t("validationDescriptionMax")),
    faculty: z.string().trim().max(120, t("validationFaculty")),
    consent: z.boolean().refine(Boolean, t("validationConsent")),
    aiConsent: z.boolean(),
    website: z.string(),
  });
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, trigger, control, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { description: "", faculty: "", consent: false, aiConsent: false, website: "" }, mode: "onTouched" });
  const role = useWatch({ control, name: "role" });
  const description = useWatch({ control, name: "description" });
  const selectedCategory = useWatch({ control, name: "category" });
  useEffect(() => { if (step > 0) headingRef.current?.focus({ preventScroll: true }); }, [step]);
  async function next() {
    const valid = await trigger(step === 0 ? ["role"] : ["category", "description", "faculty"], { shouldFocus: true });
    if (valid) { setError(""); setStep(value => value + 1); }
  }
  async function send(values: Values) {
    setError("");
    try { setReceipt(await postPublic<Receipt>("/api/feedback", { ...values, locale, startedAt })); window.scrollTo({ top: 0, behavior: "smooth" }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "unknown"); }
  }
  if (receipt) return <SubmissionReceipt receipt={receipt} />;
  return <div className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 sm:py-14 lg:py-16">
    <div className="mb-8 flex flex-wrap items-center gap-3"><p className="text-[10px] font-semibold tracking-[1.7px] text-primary">{t("eyebrow")}</p>{demo && <DemoBadge />}</div>
    <h1 className="text-[32px] font-medium leading-tight tracking-[-1.2px] text-foreground sm:text-[43px]">{t("title")}</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">{t("description")}</p>
    <div className="mt-9 grid items-start gap-7 lg:grid-cols-[1fr_280px]">
      <div className="overflow-hidden rounded-sm border border-border bg-[#fffefa]">
        <ol className="flex border-b border-border bg-[#f0f0e9]/60 px-5 py-5 sm:px-8" aria-label={t("stepLabel", { current: step + 1, total: 3 })}>{(["role", "details", "consent"] as const).map((key, index) => <li key={key} className="flex flex-1 items-center gap-2 last:flex-none" aria-current={index === step ? "step" : undefined}><span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold", index <= step ? "bg-primary text-white" : "bg-[#dedfd7]/70 text-muted-foreground")}>{index < step ? <Check className="size-3.5" /> : index + 1}</span><span className={cn("text-[11px] font-medium sm:text-xs", index === step ? "text-foreground" : "text-muted-foreground")}>{t(`steps.${key}`)}</span>{index < 2 && <span className="mx-2 h-px flex-1 bg-[#dedfd7] sm:mx-4" />}</li>)}</ol>
        <form noValidate onSubmit={event => { if (step < 2) { event.preventDefault(); void next(); } else { void handleSubmit(send)(event); } }} className="p-5 sm:p-8">
          <div className="absolute -left-[9999px] top-auto size-px overflow-hidden" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} /></div>
          <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-[-0.5px] text-foreground outline-none">{t(step === 0 ? "roleTitle" : step === 1 ? "detailsTitle" : "consentTitle")}</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">{t(step === 0 ? "roleDescription" : step === 1 ? "detailsDescription" : "consentDescription")}</p>
          {step === 0 && <div className="mt-7">
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t("roleTitle")} aria-describedby={errors.role ? "role-error" : undefined}>{([{ value: "student", icon: GraduationCap }, { value: "teacher", icon: BookOpen }] as const).map(({ value, icon: Icon }) => <label key={value} className={cn("relative flex cursor-pointer flex-col rounded-sm border-2 p-5 transition hover:border-[#b3c1aa]", role === value ? "border-primary bg-[#eaf0e3]/40" : "border-border bg-[#fffefa]")}><input type="radio" value={value} className="peer sr-only" {...register("role")} /><span className="pointer-events-none absolute inset-[-2px] rounded-sm peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20" /><span className={cn("mb-4 grid size-11 place-items-center rounded-sm", role === value ? "bg-[#e0e7d8] text-primary" : "bg-[#e9eae2] text-muted-foreground")}><Icon className="size-6" strokeWidth={1.5} /></span><span className="text-sm font-semibold text-foreground">{c(`roles.${value}`)}</span><span className="mt-2 text-xs leading-6 text-muted-foreground">{t(value === "student" ? "studentDescription" : "teacherDescription")}</span><span className={cn("absolute right-4 top-4 grid size-4 place-items-center rounded-full border", role === value ? "border-primary bg-primary text-white" : "border-[#bfc6b4]")}>{role === value && <Check className="size-2.5" />}</span></label>)}</div>
            {errors.role && <p id="role-error" role="alert" className="mt-2 text-xs text-red-700">{errors.role.message}</p>}
            <div className="mt-6 flex gap-3 rounded-sm bg-[#eeeee6] p-4"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="text-xs font-semibold text-foreground">{t("anonymousTitle")}</p><p className="mt-1.5 text-xs leading-6 text-muted-foreground">{t("anonymousDescription")}</p></div></div>
          </div>}
          {step === 1 && <div className="mt-7 space-y-5">
            <div><label htmlFor="category" className={publicLabelClass}>{t("categoryLabel")} <span className="text-primary">*</span></label><select id="category" {...register("category")} className={publicInputClass} aria-invalid={!!errors.category} aria-describedby={errors.category ? "category-error" : undefined}><option value="">{t("categoryPlaceholder")}</option>{categories.map(category => <option value={category} key={category}>{c(`categories.${category}`)}</option>)}</select>{errors.category && <p id="category-error" role="alert" className="mt-2 text-xs text-red-700">{errors.category.message}</p>}</div>
            <div><label htmlFor="faculty" className={publicLabelClass}>{t("facultyLabel")} <span className="font-normal text-muted-foreground">({c("optional")})</span></label><input id="faculty" {...register("faculty")} className={publicInputClass} maxLength={120} placeholder={t("facultyPlaceholder")} aria-invalid={!!errors.faculty} aria-describedby={errors.faculty ? "faculty-error" : undefined} />{errors.faculty && <p id="faculty-error" role="alert" className="mt-2 text-xs text-red-700">{errors.faculty.message}</p>}</div>
            <div><label htmlFor="description" className={publicLabelClass}>{t("descriptionLabel")} <span className="text-primary">*</span></label><textarea id="description" {...register("description")} rows={7} maxLength={5000} className={cn(publicInputClass, "h-auto resize-y py-3 leading-7")} placeholder={t("descriptionPlaceholder")} aria-invalid={!!errors.description} aria-describedby={`description-hint${errors.description ? " description-error" : ""}`} /><div className="mt-2 flex items-start justify-between gap-4"><p id="description-hint" className="max-w-sm text-[10px] leading-5 text-muted-foreground">{t("descriptionHint")}</p><span className="shrink-0 text-[10px] text-muted-foreground">{t("characters", { count: description.length })}</span></div>{errors.description && <p id="description-error" role="alert" className="mt-2 text-xs text-red-700">{errors.description.message}</p>}</div>
          </div>}
          {step === 2 && <div className="mt-7 space-y-5">
            <div className="rounded-sm border border-border bg-[#f0f0e9]/60 p-4"><div className="flex items-start justify-between gap-3"><div className="flex flex-wrap gap-x-6 gap-y-2"><div><p className="text-[10px] text-muted-foreground">{t("summaryRole")}</p><p className="mt-1 text-xs font-medium text-foreground">{role ? c(`roles.${role}`) : ""}</p></div><div><p className="text-[10px] text-muted-foreground">{t("summaryCategory")}</p><p className="mt-1 text-xs font-medium text-foreground">{selectedCategory ? c(`categories.${selectedCategory}`) : ""}</p></div></div><button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setStep(1)}>{t("edit")}</button></div><p className="mt-4 text-[10px] text-muted-foreground">{t("summaryDescription")}</p><p className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs leading-6 text-[#5e6558]">{description}</p></div>
            <div><div className="flex items-start gap-3"><input id="consent" type="checkbox" {...register("consent")} className="mt-1 size-4 shrink-0 accent-primary" aria-invalid={!!errors.consent} aria-describedby={`consent-description${errors.consent ? " consent-error" : ""}`} /><div><label htmlFor="consent" className="cursor-pointer text-[13px] font-medium leading-6 text-foreground">{t("privacyConsent")} <span className="text-primary">*</span></label><p id="consent-description" className="mt-1 text-xs leading-6 text-muted-foreground">{t("privacyConsentDescription")}</p><Link href="/privacy" target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">{t("privacyLink")}<ArrowUpRight className="size-3" /></Link></div></div>{errors.consent && <p id="consent-error" role="alert" className="mt-2 text-xs text-red-700">{errors.consent.message}</p>}</div>
            <div className="rounded-sm border border-[#d1d8c9] bg-[#eaf0e3]/40 p-4"><div className="flex items-start gap-3"><input id="aiConsent" type="checkbox" {...register("aiConsent")} className="mt-1 size-4 shrink-0 accent-primary" aria-describedby="ai-consent-description" /><div><label htmlFor="aiConsent" className="flex cursor-pointer items-center gap-2 text-[13px] font-medium leading-6 text-foreground">{t("aiConsent")}</label><p id="ai-consent-description" className="mt-1.5 text-xs leading-6 text-muted-foreground">{t("aiConsentDescription")}</p>{demo && <p className="mt-2 text-[11px] leading-6 text-primary">{t("demoAiConsentDescription")}</p>}</div></div></div>
          </div>}
          {error && <PublicError error={error} className="mt-5" />}
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">{step > 0 ? <button type="button" className="inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50" disabled={isSubmitting} onClick={() => { setStep(step - 1); setError(""); }}><ArrowLeft className="size-4" />{c("back")}</button> : <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground"><LockKeyhole className="size-3" />{c("anonymous")}</span>}<button type="submit" disabled={isSubmitting} className={cn(publicButtonClass, "px-5")}>{isSubmitting ? <Spinner /> : step === 2 ? <Send className="size-4" /> : null}{isSubmitting ? t("submitting") : step === 2 ? t("submitButton") : c("next")}{step < 2 && <ArrowRight className="size-4" />}</button></div>
          {step === 2 && <p className="mt-4 text-center text-[10px] leading-5 text-muted-foreground">{t("secureNote")}</p>}
        </form>
      </div>
      <aside className="space-y-5 lg:pt-4"><div className="rounded-sm border border-border bg-[#eeeee6] p-6"><span className="mb-5 grid size-10 place-items-center rounded-sm bg-[#fffefa] text-primary"><BookOpen className="size-5" strokeWidth={1.5} /></span><h2 className="text-sm font-semibold leading-6 text-foreground">{t("asideTitle")}</h2><ul className="mt-5 space-y-4">{[1, 2, 3].map(n => <li key={n} className="flex items-start gap-2 text-xs leading-6 text-muted-foreground"><Check className="mt-1 size-3.5 shrink-0 text-primary" />{t(`aside${n}`)}</li>)}</ul></div><p className="px-2 text-[11px] leading-6 text-muted-foreground">{t("asideNote")}</p></aside>
    </div>
  </div>;
}
