"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, CornerDownRight, LockKeyhole, MessageSquare, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { DemoBadge } from "./public-shell";
import { publicButtonClass } from "./public-shared";

function RequestExample() {
  const t = useTranslations("landing");
  return <figure className="w-full max-w-[460px] lg:ml-auto">
    <div className="mb-4 flex items-center justify-between border-b border-border pb-3 text-[10px] font-medium tracking-[1.2px] text-muted-foreground"><span>{t("exampleLabel")}</span><span className="font-mono tracking-normal">01—03</span></div>
    <div className="border border-[#d8dacf] bg-[#fffefa]">
      <div className="border-b border-border px-6 py-5 sm:px-7"><div className="flex items-center justify-between gap-4 text-[10px] text-muted-foreground"><span className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-full border border-border"><MessageSquare className="size-3" /></span>{t("exampleAuthor")}</span><ArrowUpRight className="size-4 text-primary" /></div><h2 className="mt-6 whitespace-pre-line text-[28px] font-medium leading-[1.15] tracking-[-1px] text-foreground">{t("exampleTitle")}</h2><p className="mt-3 text-[10px] text-muted-foreground">{t("exampleCategory")}</p><blockquote className="mt-5 max-w-sm text-[12px] leading-[1.9] text-[#64695f]">{t("exampleMessage")}</blockquote></div>
      <div className="bg-[#f1f2eb] px-6 py-5 sm:px-7"><p className="mb-5 text-[9px] font-medium uppercase tracking-[1.2px] text-muted-foreground">{t("exampleThreadTitle")}</p><ol className="space-y-0">{[{ label: "exampleReceived", done: true }, { label: "exampleReviewed", done: true }, { label: "exampleWork", done: false }].map((item, index) => <li key={item.label} className="relative flex gap-3.5 pb-6 last:pb-0">{index < 2 && <span aria-hidden="true" className="absolute left-[8px] top-4 h-full w-px bg-[#cbd1c5]" />}<span className={cn("relative mt-0.5 grid size-[17px] shrink-0 place-items-center rounded-full border", item.done ? "border-[#bdc7b8] bg-[#f1f2eb] text-primary" : "border-primary bg-primary text-white")}>{item.done ? <Check className="size-[9px]" strokeWidth={2} /> : <span className="size-1 rounded-full bg-white" />}</span><div><p className={cn("text-[11px]", item.done ? "text-muted-foreground" : "font-semibold text-primary")}>{t(item.label)}</p>{!item.done && <p className="mt-2 max-w-[250px] text-[10px] leading-5 text-muted-foreground">{t("exampleWorkNote")}</p>}</div></li>)}</ol></div>
    </div>
    <figcaption className="mt-3 text-[9px] leading-5 text-muted-foreground">{t("exampleFootnote")}</figcaption>
  </figure>;
}

export function Landing({ demo }: { demo: boolean }) {
  const t = useTranslations("landing");
  return <>
    <section className="mx-auto max-w-[1320px] px-5 pb-12 pt-9 sm:px-8 sm:pt-12 lg:px-12 lg:pb-16">
      <div className="mb-9 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4 lg:mb-14"><span className="text-[10px] font-medium tracking-[1.5px] text-muted-foreground">{t("eyebrow")}</span>{demo && <DemoBadge />}</div>
      <div className="grid items-center gap-12 lg:grid-cols-[1.27fr_1fr] lg:gap-12">
        <div><h1 className="text-[62px] font-medium leading-[.98] tracking-[-3.5px] text-foreground sm:text-[86px] sm:tracking-[-5px] xl:text-[106px] xl:tracking-[-6.5px]">{t("titleFirst")}<br />{t("titleSecond")}<br /><span className="text-primary">{t("titleThird")}</span></h1><p className="mt-7 max-w-[410px] text-[13px] leading-[1.9] text-muted-foreground sm:mt-9 sm:text-sm">{t("description")}</p><div className="mt-7 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-7"><Link href="/submit" className={publicButtonClass}>{t("primary")}<ArrowUpRight className="ml-3 size-4" /></Link><Link href="/track" className="inline-flex min-h-12 items-center gap-2 border-b border-transparent text-xs font-medium text-foreground transition-colors hover:border-primary">{t("secondary")}<ArrowRight className="size-3.5" /></Link></div><p className="mt-5 flex items-center gap-2 text-[10px] text-muted-foreground"><LockKeyhole className="size-3" strokeWidth={1.5} />{t("anonymous")}</p></div>
        <div className="pt-2 lg:pt-9"><RequestExample /></div>
      </div>
      <div className="mt-12 grid gap-4 border-t border-border pt-5 sm:grid-cols-3 sm:gap-6 lg:mt-16">{[{ title: "stripFirst", description: "stripFirstDesc" }, { title: "stripSecond", description: "stripSecondDesc" }, { title: "stripThird", description: "stripThirdDesc" }].map((item, index) => <div key={item.title} className="flex items-baseline gap-4"><span className="font-mono text-[10px] text-muted-foreground/65">0{index + 1}</span><p className="text-[11px] font-medium text-foreground">{t(item.title)}<span className="mt-1 block text-[10px] font-normal text-muted-foreground">{t(item.description)}</span></p></div>)}</div>
    </section>
    <section id="how-it-works" className="scroll-mt-8 border-y border-border bg-[#eeeee6]">
      <div className="mx-auto grid max-w-[1320px] gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:gap-20 lg:px-12 lg:py-24">
        <div><p className="text-[10px] font-medium tracking-[1px] text-muted-foreground">{t("sectionOne")}</p><h2 className="mt-7 whitespace-pre-line text-[35px] font-medium leading-[1.1] tracking-[-1.4px] text-foreground sm:text-[46px]">{t("howTitle")}</h2><p className="mt-5 max-w-xs text-[13px] leading-7 text-muted-foreground">{t("howDescription")}</p><ArrowDownRight className="mt-8 size-12 text-primary" strokeWidth={1} aria-hidden="true" /></div>
        <div>{[1, 2, 3].map(n => <article key={n} className="grid grid-cols-[38px_1fr] gap-4 border-t border-[#d0d3c7] py-7 last:border-b"><span className="pt-1 font-mono text-[11px] text-muted-foreground">0{n}</span><div><h3 className="text-lg font-medium tracking-[-.5px] text-foreground">{t(`step${n}Title`)}</h3><p className="mt-3 max-w-md text-[12px] leading-7 text-muted-foreground">{t(`step${n}Description`)}</p></div></article>)}</div>
      </div>
    </section>
    <section className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
      <p className="text-[10px] font-medium tracking-[1px] text-muted-foreground">{t("sectionTwo")}</p>
      <div className="mt-7 grid gap-9 lg:grid-cols-[1.1fr_1fr] lg:gap-16"><h2 className="whitespace-pre-line text-[35px] font-medium leading-[1.1] tracking-[-1.5px] text-foreground sm:text-[45px]">{t("aiTitle")}</h2><p className="max-w-md text-[13px] leading-7 text-muted-foreground lg:pt-1">{t("aiDescription")}</p></div>
      <div className="mt-12 grid border-y border-border lg:grid-cols-[1.1fr_1fr]">
        <div className="py-7 lg:border-r lg:border-border lg:pr-10"><div className="space-y-0">{[1, 2, 3].map(n => <div key={n} className="flex items-start gap-4 border-b border-border py-4 first:pt-0 last:border-0 last:pb-0"><span className="pt-1 font-mono text-[9px] text-muted-foreground/60">0{n}</span><p className="text-[13px] leading-6 text-[#595f53]">{t(`signal${n}`)}</p></div>)}</div><div className="mt-7 flex items-center gap-3 border-t border-border pt-5"><CornerDownRight className="size-5 shrink-0 text-primary" strokeWidth={1.5} /><div><p className="text-[8px] font-medium tracking-[1.2px] text-muted-foreground">{t("topicLabel")}</p><p className="mt-1.5 text-sm font-medium text-primary">{t("signalCategory")}</p></div></div></div>
        <div className="flex flex-col justify-between border-t border-border py-7 lg:border-0 lg:pl-10"><div className="space-y-4">{[1, 2, 3].map(n => <div key={n} className="flex items-start gap-3"><span className="mt-1 grid size-4 shrink-0 place-items-center border border-[#bdc7b8] text-primary"><Check className="size-2.5" /></span><p className="text-[12px] leading-6 text-foreground">{t(`aiFeature${n}`)}</p></div>)}</div><div className="mt-8 border-l-2 border-primary pl-4"><p className="text-[9px] font-medium tracking-[1px] text-primary">{t("reviewLabel")}</p><p className="mt-2 max-w-xs text-[12px] leading-6 text-muted-foreground">{t("workflowNote")}</p></div></div>
      </div><p className="mt-4 text-[10px] leading-6 text-muted-foreground">{t("aiNote")}</p>
    </section>
    <section className="border-t border-border"><div className="mx-auto grid max-w-[1320px] gap-7 px-5 py-14 sm:px-8 lg:grid-cols-[.55fr_1fr_1fr] lg:gap-10 lg:px-12 lg:py-16"><div><p className="text-[9px] font-medium tracking-[1px] text-muted-foreground">{t("sectionThree")}</p><ShieldCheck className="mt-6 size-9 text-primary" strokeWidth={1} /></div><h2 className="whitespace-pre-line text-[30px] font-medium leading-[1.15] tracking-[-1px] text-foreground">{t("privacyTitle")}</h2><div><p className="text-[12px] leading-7 text-muted-foreground">{t("privacyDescription")}</p><Link href="/privacy" className="mt-4 inline-flex items-center gap-3 border-b border-primary/35 pb-1.5 text-[11px] font-medium text-primary hover:border-primary">{t("privacyLink")}<ArrowUpRight className="size-3.5" /></Link></div></div></section>
    <section className="bg-[#293f33] text-[#f6f5f1]"><div className="mx-auto max-w-[1320px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20"><p className="text-[9px] font-medium tracking-[1.4px] text-[#b4c0aa]">{t("closingLabel")}</p><div className="mt-7 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:gap-16"><h2 className="whitespace-pre-line text-[39px] font-medium leading-[1.06] tracking-[-1.8px] sm:text-[53px]">{t("ctaTitle")}</h2><div><p className="max-w-xs text-[12px] leading-7 text-[#b4c0aa]">{t("ctaDescription")}</p><Link href="/submit" className="mt-6 inline-flex min-h-12 items-center justify-between gap-10 border-b border-[#9eaf94] pb-2 text-sm font-medium text-[#f6f5f1] transition-colors hover:border-white">{t("ctaButton")}<ArrowUpRight className="size-6" strokeWidth={1.5} /></Link></div></div></div></section>
  </>;
}
