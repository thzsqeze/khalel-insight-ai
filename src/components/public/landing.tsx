"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, CheckCheck, CircleCheck, Clock3, Fingerprint, GitMerge, LockKeyhole, MessageSquare, ShieldCheck, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { DemoBadge } from "./public-shell";
import { publicButtonClass, publicOutlineClass, StatusPill } from "./public-shared";

function DashboardPreview() {
  const t = useTranslations("landing");
  return <div className="relative mx-auto w-full max-w-[530px] pb-12 pt-7 lg:pb-10 lg:pt-14">
    <div aria-hidden="true" className="absolute -left-10 -top-6 size-[450px] max-w-full rounded-full border border-teal-200/35 bg-[radial-gradient(circle_at_center,#dcf0e955,transparent_70%)]" />
    <div aria-hidden="true" className="absolute inset-x-5 top-20 h-[410px] rounded-[30px] bg-[#e9f3ef] [transform:rotate(-5deg)]" />
    <div className="relative rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_24px_65px_-25px_#244e4538] sm:p-7">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-5"><div><div className="mb-1.5 flex items-center gap-2"><span className="size-2 rounded-full bg-teal-600" /><span className="text-[9px] font-semibold tracking-[1.4px] text-slate-400">KHALEL INSIGHT AI</span></div><h2 className="text-lg font-semibold tracking-tight text-slate-800">{t("previewTitle")}</h2></div><span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] text-slate-500">{t("previewDemo")}</span></div>
      <div className="grid grid-cols-3 gap-3 py-5">
        {[{ label: "previewReceived", value: "128", cls: "text-slate-800" }, { label: "previewInProgress", value: "24", cls: "text-slate-800" }, { label: "previewResolved", value: "86", cls: "text-primary" }].map((item) => <div key={item.label}><p className="text-[10px] text-slate-400 sm:text-[11px]">{t(item.label)}</p><p className={cn("mt-1.5 text-3xl font-semibold tracking-[-1px]", item.cls)}>{item.value}</p></div>)}
      </div>
      <div className="rounded-xl border border-slate-100 bg-[#fafcfc] px-4 pb-3 pt-4"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-semibold text-slate-600">{t("previewTrend")}</span><span className="text-[9px] text-slate-400">{t("previewPeriod")}</span></div>
        <svg viewBox="0 0 400 122" className="mt-4 h-auto w-full" role="img" aria-label={t("previewChartLabel")}><defs><linearGradient id="public-chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#118876" stopOpacity=".17"/><stop offset="100%" stopColor="#118876" stopOpacity="0"/></linearGradient></defs>{[20, 55, 90].map(y => <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="#e7eeeb" strokeDasharray="3 5"/>)}<path d="M0 100C20 100 25 87 48 91S82 60 105 66S135 75 157 51S189 58 211 41S246 53 267 24S304 44 325 23S357 34 378 12S395 13 400 5V122H0Z" fill="url(#public-chart-fill)"/><path d="M0 100C20 100 25 87 48 91S82 60 105 66S135 75 157 51S189 58 211 41S246 53 267 24S304 44 325 23S357 34 378 12S395 13 400 5" fill="none" stroke="#138472" strokeWidth="2.5" strokeLinecap="round"/></svg>
        <div className="mt-1 flex justify-between text-[8px] text-slate-400">{[1, 2, 3, 4].map(n => <span key={n}>{t(`previewWeek${n}`)}</span>)}</div>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 p-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-primary"><CheckCheck className="size-4" /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold text-slate-700 sm:text-[11px]">{t("previewIssue")}</p><p className="mt-1 text-[9px] text-slate-400">{t("previewCount")}</p></div><StatusPill status="resolved" /></div>
    </div>
    <div className="absolute -bottom-1 left-0 right-7 flex items-center gap-3 rounded-xl border border-white bg-white/95 p-4 shadow-[0_8px_35px_-10px_#244e4526] sm:-left-5 sm:right-auto sm:max-w-[330px]"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e9f5ef] text-primary"><Sparkles className="size-5" /></span><div><p className="text-xs font-semibold text-slate-800">{t("previewAiTitle")}</p><p className="mt-1 text-[10px] text-slate-400">{t("previewAiText")}</p></div><span className="ml-1 size-1.5 shrink-0 rounded-full bg-primary" /></div>
    <div className="absolute right-0 top-0 flex items-center gap-2 rounded-full border border-teal-100 bg-white px-3.5 py-2 shadow-sm lg:top-6"><ShieldCheck className="size-3.5 text-primary" /><span className="text-[9px] font-medium text-slate-600">{t("previewPrivacy")}</span></div>
  </div>;
}

export function Landing({ demo }: { demo: boolean }) {
  const t = useTranslations("landing");
  return <>
    <section className="relative overflow-hidden bg-[#f8faf9]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(#d0dfd8_0.6px,transparent_0.6px)] [background-size:18px_18px] [mask-image:linear-gradient(to_right,transparent,black)]" />
      <div className="relative mx-auto max-w-[1280px] px-5 pb-14 pt-10 sm:px-8 sm:pb-16 sm:pt-14 lg:px-10 lg:pb-20 lg:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
          <div className="relative z-10">
            <div className="mb-7 flex flex-wrap items-center gap-3"><span className="flex items-center gap-2 text-[10px] font-semibold tracking-[1.65px] text-primary"><span className="size-1.5 rounded-full bg-primary" />{t("eyebrow")}</span>{demo && <DemoBadge />}</div>
            <h1 className="text-[43px] font-medium leading-[1.08] tracking-[-2px] text-[#203b35] sm:text-[60px] sm:tracking-[-2.8px] xl:text-[70px] xl:tracking-[-3.5px]">{t("titleFirst")}<br />{t("titleSecond")}<br /><span className="relative inline-block text-primary">{t("titleThird")}<svg className="absolute -bottom-2 left-0 h-3 w-full text-[#b8daca]" viewBox="0 0 220 12" fill="none" aria-hidden="true" preserveAspectRatio="none"><path d="M2 8C65 0 136 0 218 5" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></svg></span></h1>
            <p className="mt-8 max-w-[460px] text-[15px] leading-[1.85] text-slate-500">{t("description")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/submit" className={publicButtonClass}>{t("primary")}<ArrowUpRight className="ml-1 size-4" /></Link><Link href="/track" className={cn(publicOutlineClass, "bg-transparent")}>{t("secondary")}<ArrowRight className="size-4" /></Link></div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-slate-400"><span className="inline-flex items-center gap-1.5"><LockKeyhole className="size-3" />{t("anonymous")}</span><span className="inline-flex items-center gap-1.5"><Clock3 className="size-3" />{t("time")}</span></div>
          </div>
          <div><DashboardPreview /><p className="mt-7 text-center text-[9px] font-medium tracking-[1.5px] text-slate-400">{t("previewLabel")}</p></div>
        </div>
      </div>
    </section>
    <div className="border-y border-border bg-white">
      <div className="mx-auto grid max-w-[1280px] gap-7 px-5 py-7 sm:grid-cols-3 sm:gap-4 sm:px-8 lg:px-10">
        {[{ icon: Fingerprint, title: "stripFirst", description: "stripFirstDesc" }, { icon: Clock3, title: "stripSecond", description: "stripSecondDesc" }, { icon: Users, title: "stripThird", description: "stripThirdDesc" }].map(({ icon: Icon, title, description }) => <div key={title} className="flex items-center gap-4 sm:justify-center sm:border-r sm:border-border sm:last:border-0"><Icon strokeWidth={1.5} className="size-7 shrink-0 text-primary/80" /><div><p className="text-xs font-semibold text-slate-700">{t(title)}</p><p className="mt-1 text-[11px] text-slate-400">{t(description)}</p></div></div>)}
      </div>
    </div>
    <section id="how-it-works" className="scroll-mt-6 bg-white">
      <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-[10px] font-semibold tracking-[1.7px] text-primary">{t("howEyebrow")}</p><h2 className="mt-4 whitespace-pre-line text-3xl font-medium leading-tight tracking-[-1.1px] text-[#203b35] sm:text-[39px]">{t("howTitle")}</h2></div><p className="max-w-[320px] pb-1 text-sm leading-7 text-slate-500">{t("howDescription")}</p></div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[MessageSquare, Sparkles, CircleCheck].map((Icon, index) => <article key={index} className="group relative rounded-2xl border border-border bg-[#fafbfa] p-7 transition-colors hover:border-teal-200"><div className="flex items-start justify-between"><span className="grid size-12 place-items-center rounded-xl border border-teal-100 bg-white text-primary"><Icon className="size-[22px]" strokeWidth={1.5} /></span><span className="text-[12px] font-medium text-slate-300">0{index + 1}</span></div><h3 className="mt-8 text-base font-semibold tracking-[-0.3px] text-slate-800">{t(`step${index + 1}Title`)}</h3><p className="mt-3 text-[13px] leading-7 text-slate-500">{t(`step${index + 1}Description`)}</p></article>)}
        </div>
      </div>
    </section>
    <section className="border-y border-border bg-[#f2f6f3]">
      <div className="mx-auto grid max-w-[1280px] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-24 lg:px-10 lg:py-24">
        <div className="order-2 rounded-[24px] border border-white bg-white/45 p-5 sm:p-9 lg:order-1">
          <div className="space-y-2.5">{[1, 2, 3].map((n) => <div key={n} className={cn("flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white px-4 py-4 text-[11px] text-slate-600 shadow-[0_2px_5px_#173d2910]", n === 2 && "ml-5", n === 3 && "mr-4")}><MessageSquare className="size-3.5 shrink-0 text-slate-400" />{t(`signal${n}`)}</div>)}</div>
          <div className="flex flex-col items-center py-5 text-primary/50"><div className="h-4 w-px bg-primary/20" /><GitMerge className="my-2 size-5" /><ArrowDown className="size-4" /></div>
          <div className="rounded-xl border border-teal-200 bg-white p-5"><div className="mb-3 flex items-center gap-2 text-[10px] font-medium text-primary"><Sparkles className="size-3.5" />{t("signalResult")}</div><p className="text-base font-semibold text-slate-800">{t("signalCategory")}</p><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] text-slate-400">{t("signalCount")}</span><span className="rounded-full bg-teal-50 px-2.5 py-1 text-[9px] font-medium text-primary">{t("signalReview")}</span></div></div>
        </div>
        <div className="order-1 lg:order-2"><p className="text-[10px] font-semibold tracking-[1.6px] text-primary">{t("aiEyebrow")}</p><h2 className="mt-4 whitespace-pre-line text-3xl font-medium leading-tight tracking-[-1px] text-[#203b35] sm:text-[38px]">{t("aiTitle")}</h2><p className="mt-5 text-sm leading-7 text-slate-500">{t("aiDescription")}</p><ul className="mt-6 space-y-3.5">{[1, 2, 3].map(n => <li key={n} className="flex items-center gap-2.5 text-xs text-slate-700"><span className="grid size-5 place-items-center rounded-full bg-teal-100/70 text-primary"><Check className="size-3" /></span>{t(`aiFeature${n}`)}</li>)}</ul><p className="mt-6 border-t border-teal-900/10 pt-4 text-[11px] leading-6 text-slate-400">{t("aiNote")}</p></div>
      </div>
    </section>
    <section className="bg-white"><div className="mx-auto grid max-w-[1280px] items-center gap-8 px-5 py-16 sm:px-8 md:grid-cols-[1fr_1.2fr] lg:px-10 lg:py-20"><div className="flex items-center gap-5"><span className="grid size-16 shrink-0 place-items-center rounded-2xl border border-teal-100 bg-teal-50 text-primary"><ShieldCheck className="size-8" strokeWidth={1.5} /></span><h2 className="whitespace-pre-line text-2xl font-medium leading-tight tracking-[-0.6px] text-[#203b35]">{t("privacyTitle")}</h2></div><div><p className="text-sm leading-7 text-slate-500">{t("privacyDescription")}</p><Link href="/privacy" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline">{t("privacyLink")}<ArrowUpRight className="size-3.5" /></Link></div></div></section>
    <section className="bg-white px-5 pb-16 sm:px-8 lg:px-10"><div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-3xl bg-[#113f36] px-6 py-14 text-center sm:py-16"><div aria-hidden="true" className="absolute -left-24 -top-28 size-80 rounded-full border border-white/8" /><div aria-hidden="true" className="absolute -bottom-44 -right-16 size-[400px] rounded-full border border-white/8" /><div className="relative"><span className="mb-5 inline-grid size-10 place-items-center rounded-xl border border-white/15 text-teal-200"><MessageSquare className="size-5" strokeWidth={1.5} /></span><h2 className="whitespace-pre-line text-3xl font-medium leading-tight tracking-[-1px] text-white sm:text-[39px]">{t("ctaTitle")}</h2><p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-teal-100/55">{t("ctaDescription")}</p><div className="mt-7 flex flex-col justify-center gap-4 sm:flex-row"><Link href="/submit" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#e6f2e8] px-6 py-3 text-sm font-semibold text-[#163f34] transition hover:bg-white">{t("ctaButton")}<ArrowUpRight className="size-4" /></Link><Link href="/issues" className="inline-flex min-h-12 items-center justify-center gap-2 px-4 text-xs font-medium text-white/75 transition hover:text-white">{t("ctaSecondary")}<ArrowRight className="size-4" /></Link></div></div></div></section>
  </>;
}
