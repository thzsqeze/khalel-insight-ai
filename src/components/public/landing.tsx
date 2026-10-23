"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, ArrowUpRight, BookOpen, Building2, Check, Clock3, FileText, Layers3, LockKeyhole, MessageSquare, Monitor, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { categories } from "@/lib/types";
import { publicButtonClass } from "./public-shared";

const categoryIcons = { timetable: Clock3, education: BookOpen, infrastructure: Building2, digital_services: Monitor, communication: MessageSquare, administration: Users, other: FileText };

function CategoryChooser() {
  const t = useTranslations("landing");
  const c = useTranslations("commonPublic");
  return <section aria-labelledby="choose-topic-title" className="relative rounded-2xl bg-[#293f33] p-6 text-white shadow-[0_20px_60px_-32px_#293f3360] sm:p-8">
    <div className="flex items-start justify-between gap-4"><p className="max-w-[230px] text-xs font-medium leading-5 tracking-[1px] text-[#ccd9a9]">{t("chooserEyebrow")}</p><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-[#dfebb6] text-[#293f33]"><ArrowUpRight className="size-5" /></span></div>
    <h2 id="choose-topic-title" className="mt-5 whitespace-pre-line text-[31px] font-medium leading-[1.13] tracking-[-1px] sm:text-[35px]">{t("chooserTitle")}</h2>
    <p className="mt-4 max-w-sm text-[13px] leading-6 text-[#c4cebf]">{t("chooserDescription")}</p>
    <div className="mt-7 grid grid-cols-2 gap-2.5">{categories.filter(category => category !== "other").map(category => { const Icon = categoryIcons[category]; return <Link key={category} href={`/submit?category=${category}`} className="group flex min-h-[92px] flex-col items-start justify-between gap-3 rounded-xl border border-white/15 bg-white/6 px-3.5 py-3.5 transition hover:border-[#dfebb6] hover:bg-[#dfebb6] hover:text-[#293f33] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dfebb6]"><Icon className="size-5 text-[#dfebb6] group-hover:text-[#293f33]" strokeWidth={1.5} /><span className="text-xs font-medium leading-5">{c(`categories.${category}`)}</span></Link>; })}</div>
    <Link href="/submit?category=other" className="mt-3 flex min-h-12 items-center justify-between rounded-xl border border-white/15 px-4 text-xs font-medium transition hover:bg-white/10">{t("chooserOther")}<ArrowRight className="size-4" /></Link>
    <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-[#b4c2ac]"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" />{t("chooserPrivacy")}</p>
  </section>;
}

export function Landing() {
  const t = useTranslations("landing");
  return <>
    <section className="mx-auto max-w-[1320px] px-5 pb-12 pt-10 sm:px-8 sm:pt-14 lg:px-12 lg:pb-16">
      <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
        <div><p className="mb-7 max-w-md text-xs font-semibold leading-6 tracking-[1.2px] text-primary">{t("eyebrow")}</p><h1 className="text-[59px] font-medium leading-[1.01] tracking-[-3px] text-foreground sm:text-[80px] sm:tracking-[-4px] xl:text-[94px] xl:tracking-[-5px]">{t("titleFirst")}<br />{t("titleSecond")}<br /><span className="text-primary">{t("titleThird")}</span></h1><p className="mt-7 max-w-[430px] text-[15px] leading-[1.85] text-muted-foreground">{t("description")}</p><div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6"><Link href="/submit" className={publicButtonClass}>{t("primary")}<ArrowUpRight className="ml-2 size-4" /></Link><Link href="/track" className="inline-flex min-h-12 items-center gap-2 text-sm font-medium text-foreground hover:text-primary">{t("secondary")}<ArrowRight className="size-4" /></Link></div><p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="size-3.5" strokeWidth={1.5} />{t("anonymous")}</p></div>
        <CategoryChooser />
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-3 lg:mt-14">{[{ title: "stripFirst", description: "stripFirstDesc", icon: LockKeyhole, color: "bg-[#e8eedb]" }, { title: "stripSecond", description: "stripSecondDesc", icon: Clock3, color: "bg-[#f1e4c5]" }, { title: "stripThird", description: "stripThirdDesc", icon: Users, color: "bg-[#e6e9e1]" }].map(({ title, description, icon: Icon, color }) => <div key={title} className="flex items-center gap-4 rounded-2xl border border-border/70 bg-[#fffefa] px-5 py-5"><span className={cn("grid size-10 shrink-0 place-items-center rounded-xl text-primary", color)}><Icon className="size-5" strokeWidth={1.5} /></span><p className="text-[13px] font-semibold text-foreground">{t(title)}<span className="mt-1.5 block text-xs font-normal leading-5 text-muted-foreground">{t(description)}</span></p></div>)}</div>
    </section>
    <section id="how-it-works" className="scroll-mt-8 bg-[#eeeee6]">
      <div className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
        <p className="text-xs font-medium tracking-[1px] text-muted-foreground">{t("sectionOne")}</p><div className="mt-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><h2 className="whitespace-pre-line text-[35px] font-medium leading-[1.12] tracking-[-1.3px] text-foreground sm:text-[45px]">{t("howTitle")}</h2><p className="max-w-[350px] text-sm leading-7 text-muted-foreground">{t("howDescription")}</p></div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">{[MessageSquare, Layers3, Check].map((Icon, index) => <article key={index} className="rounded-2xl border border-[#d9ddcf] bg-[#fffefa] p-6 sm:p-7"><div className="flex items-center justify-between"><span className={cn("grid size-12 place-items-center rounded-xl text-primary", index === 1 ? "bg-[#f1e4c5]" : "bg-[#e8eedb]")}><Icon className="size-6" strokeWidth={1.5} /></span><span className="font-mono text-xs text-muted-foreground">0{index + 1}</span></div><h3 className="mt-7 text-lg font-semibold tracking-[-.4px] text-foreground">{t(`step${index + 1}Title`)}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{t(`step${index + 1}Description`)}</p></article>)}</div>
      </div>
    </section>
    <section className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14"><div><p className="text-xs font-medium tracking-[1px] text-muted-foreground">{t("sectionTwo")}</p><h2 className="mt-6 whitespace-pre-line text-[35px] font-medium leading-[1.12] tracking-[-1.3px] text-foreground sm:text-[43px]">{t("aiTitle")}</h2><p className="mt-5 max-w-lg text-sm leading-7 text-muted-foreground">{t("aiDescription")}</p><ul className="mt-7 space-y-4">{[1, 2, 3].map(n => <li key={n} className="flex items-center gap-3 text-sm text-foreground"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#e0e9cf] text-primary"><Check className="size-3" /></span>{t(`aiFeature${n}`)}</li>)}</ul></div><div className="rounded-2xl border border-[#ded5bb] bg-[#f1e6cf] p-7 sm:p-9"><span className="grid size-12 place-items-center rounded-xl bg-[#fff9ea] text-[#8b6b2d]"><Users className="size-6" strokeWidth={1.5} /></span><h3 className="mt-6 whitespace-pre-line text-[27px] font-medium leading-tight tracking-[-.8px] text-[#473e2d]">{t("aiPanelTitle")}</h3><p className="mt-4 text-sm leading-7 text-[#786a50]">{t("aiPanelDescription")}</p><div className="mt-7 space-y-3 border-t border-[#d9ccae] pt-5"><p className="flex items-center gap-2 text-xs font-medium text-[#65563b]"><ShieldCheck className="size-4" />{t("aiConsentLabel")}</p><p className="flex items-center gap-2 text-xs font-medium text-[#65563b]"><Check className="size-4" />{t("aiReviewLabel")}</p></div></div></div>
    </section>
    <section className="mx-auto max-w-[1320px] px-5 pb-16 sm:px-8 lg:px-12"><div className="grid gap-7 rounded-2xl border border-[#d4ddc3] bg-[#e8eedb] p-7 sm:p-9 lg:grid-cols-[1fr_1.2fr] lg:gap-16"><div><ShieldCheck className="mb-5 size-9 text-primary" strokeWidth={1.5} /><h2 className="whitespace-pre-line text-[30px] font-medium leading-[1.15] tracking-[-1px] text-foreground">{t("privacyTitle")}</h2></div><div className="lg:pt-3"><p className="text-sm leading-7 text-[#69745c]">{t("privacyDescription")}</p><Link href="/privacy" className="mt-5 inline-flex items-center gap-3 text-sm font-semibold text-primary hover:underline">{t("privacyLink")}<ArrowUpRight className="size-4" /></Link></div></div></section>
    <section className="bg-[#293f33] text-[#f6f5f1]"><div className="mx-auto max-w-[1320px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20"><p className="text-xs font-medium tracking-[1px] text-[#c1d09e]">{t("closingLabel")}</p><div className="mt-7 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:gap-16"><h2 className="whitespace-pre-line text-[37px] font-medium leading-[1.1] tracking-[-1.6px] sm:text-[51px]">{t("ctaTitle")}</h2><div><p className="max-w-sm text-sm leading-7 text-[#c4cebf]">{t("ctaDescription")}</p><Link href="/submit" className="mt-6 inline-flex min-h-12 items-center justify-between gap-8 rounded-xl bg-[#dfebb6] px-5 py-3 text-sm font-semibold text-[#293f33] transition hover:bg-[#edf4d4]">{t("ctaButton")}<ArrowUpRight className="size-5" /></Link></div></div></div></section>
  </>;
}
