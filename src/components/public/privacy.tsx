"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, FlaskConical, ShieldCheck } from "lucide-react";
import { publicButtonClass } from "./public-shared";

export function Privacy({ demo }: { demo: boolean }) {
  const t = useTranslations("privacy");
  return <div className="mx-auto max-w-[860px] px-5 py-12 sm:px-8 sm:py-16">
    <span className="mb-6 inline-grid size-12 place-items-center rounded-xl border border-teal-100 bg-teal-50 text-primary"><ShieldCheck className="size-6" strokeWidth={1.5} /></span><p className="text-[10px] font-semibold tracking-[1.7px] text-primary">{t("eyebrow")}</p><h1 className="mt-5 whitespace-pre-line text-4xl font-medium leading-[1.12] tracking-[-1.5px] text-[#203b35] sm:text-[45px]">{t("title")}</h1><p className="mt-5 max-w-xl text-sm leading-7 text-slate-500">{t("description")}</p>
    <div className="mt-8 rounded-xl border border-border bg-white p-5 text-xs leading-7 text-slate-600">{t("intro")}</div>
    {demo && <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-5"><FlaskConical className="mt-0.5 size-5 shrink-0 text-amber-700" /><div><h2 className="text-sm font-semibold text-amber-900">{t("demoTitle")}</h2><p className="mt-2 text-xs leading-7 text-amber-800">{t("demoText")}</p></div></div>}
    <div className="mt-10 space-y-8">{[1, 2, 3, 4, 5, 6, 7].map(n => <section key={n} className="flex gap-4 border-b border-border pb-8 last:border-0"><span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/7 text-[11px] font-semibold text-primary">0{n}</span><div><h2 className="text-base font-semibold leading-7 tracking-[-0.3px] text-slate-800">{t(`section${n}Title`)}</h2><p className="mt-3 text-[13px] leading-8 text-slate-500">{t(`section${n}Text`)}</p></div></section>)}</div>
    <div className="mt-7 flex flex-col justify-between gap-5 border-t border-border pt-7 sm:flex-row sm:items-center"><p className="text-[10px] text-slate-400">{t("version")}</p><Link href="/submit" className={publicButtonClass}>{t("back")}<ArrowRight className="size-4" /></Link></div>
  </div>;
}
