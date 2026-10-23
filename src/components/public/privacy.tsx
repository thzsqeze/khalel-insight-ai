"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { publicButtonClass } from "./public-shared";
import { CookieSettingsButton } from "@/components/cookie-consent";

export function Privacy() {
  const t = useTranslations("privacy");
  return <div className="mx-auto max-w-[860px] px-5 py-12 sm:px-8 sm:py-16">
    <span className="mb-6 inline-grid size-12 place-items-center rounded-xl border border-[#d1d8c9] bg-[#eaf0e3] text-primary"><ShieldCheck className="size-6" strokeWidth={1.5} /></span><p className="text-xs font-semibold tracking-[1.7px] text-primary">{t("eyebrow")}</p><h1 className="mt-5 whitespace-pre-line text-4xl font-medium leading-[1.12] tracking-[-1.5px] text-foreground sm:text-[45px]">{t("title")}</h1><p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">{t("description")}</p>
    <div className="mt-8 rounded-2xl border border-border bg-[#fffefa] p-5 text-xs leading-7 text-[#5e6558]">{t("intro")}</div>
    <div className="mt-10 space-y-8">{[1, 2, 3, 4, 5, 6, 7, 8].map(n => <section key={n} className="flex gap-4 border-b border-border pb-8 last:border-0"><span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-xl bg-primary/7 text-xs font-semibold text-primary">0{n}</span><div><h2 className="text-base font-semibold leading-7 tracking-[-0.3px] text-foreground">{t(`section${n}Title`)}</h2><p className="mt-3 text-[13px] leading-8 text-muted-foreground">{t(`section${n}Text`)}</p>{n === 7 && <CookieSettingsButton className="mt-3 min-h-11 font-medium text-primary underline underline-offset-4" />}</div></section>)}</div>
    <div className="mt-7 flex flex-col justify-between gap-5 border-t border-border pt-7 sm:flex-row sm:items-center"><p className="text-xs text-muted-foreground">{t("version")}</p><Link href="/submit" className={publicButtonClass}>{t("back")}<ArrowRight className="size-4" /></Link></div>
  </div>;
}
