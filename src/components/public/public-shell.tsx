"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function PublicLogo({ inverse = false }: { inverse?: boolean }) {
  return <span className="flex items-center gap-2.5">
    <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-white", inverse && "bg-white/15")} aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 4v16M19 4l-8 8 8 8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 12h6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/><circle cx="19" cy="4" r="2" fill="currentColor"/></svg>
    </span>
    <span className={cn("text-[19px] font-semibold tracking-[-0.7px] text-slate-900", inverse && "text-white")}>Khalel<span className={cn("ml-1 font-normal text-slate-500", inverse && "text-teal-100/75")}>Insight</span><span className={cn("ml-1.5 rounded bg-primary/9 px-1 py-0.5 align-middle text-[9px] font-bold tracking-normal text-primary", inverse && "bg-white/15 text-white")}>AI</span></span>
  </span>;
}

export function PublicShell({ children, demo = false }: { children: React.ReactNode; demo?: boolean }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [localeError, setLocaleError] = useState(false);
  const navItems = [{ href: "/#how-it-works", label: "how" }, { href: "/issues", label: "progress" }, { href: "/track", label: "track" }] as const;
  async function setLocale(next: "ru" | "kk") {
    if (locale === next || switching) return;
    setSwitching(true);
    setLocaleError(false);
    try {
      const response = await fetch("/api/locale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: next }) });
      if (!response.ok) throw new Error("locale");
      router.refresh();
    } catch { setLocaleError(true); } finally { setSwitching(false); }
  }
  const languages = <div className="inline-flex items-center rounded-lg border border-border bg-white p-0.5" role="group" aria-label={t("language")}>
    {(["ru", "kk"] as const).map((lang) => <button key={lang} type="button" lang={lang} aria-pressed={locale === lang} disabled={switching} onClick={() => setLocale(lang)} className={cn("min-h-8 min-w-9 rounded-md px-2 text-[11px] font-semibold transition-colors disabled:opacity-50", locale === lang ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-primary")}>{lang === "ru" ? "РУС" : "ҚАЗ"}</button>)}
  </div>;
  return <div className="min-h-screen bg-background text-foreground">
    <header className="relative z-30 border-b border-border/70 bg-white/95">
      <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-10">
        <Link href="/" aria-label={`Khalel Insight AI — ${t("home")}`} onClick={() => setOpen(false)}><PublicLogo /></Link>
        <nav className="hidden items-center gap-7 lg:flex" aria-label={t("home")}>
          {navItems.map((item) => <Link key={item.href} href={item.href} className={cn("text-[13px] font-medium text-slate-500 transition hover:text-primary", pathname === item.href && "text-primary")} aria-current={pathname === item.href ? "page" : undefined}>{t(item.label)}</Link>)}
        </nav>
        <div className="flex items-center gap-3 sm:gap-5">
          {languages}
          <Link href="/login" className="hidden items-center gap-1.5 text-[12px] font-semibold text-slate-700 transition hover:text-primary sm:flex">{t("login")}<ArrowUpRight className="size-3.5" /></Link>
          <button type="button" className="grid size-10 place-items-center rounded-lg border border-border text-slate-600 lg:hidden" aria-label={t(open ? "closeMenu" : "openMenu")} aria-expanded={open} aria-controls="public-mobile-nav" onClick={() => setOpen(!open)}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        </div>
      </div>
      {localeError && <p role="alert" className="mx-auto max-w-[1280px] px-5 pb-2 text-xs text-red-700">{t("switchError")}</p>}
      {open && <nav id="public-mobile-nav" className="space-y-1 border-t border-border bg-white px-5 py-4 lg:hidden" aria-label={t("openMenu")}>
        {navItems.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">{t(item.label)}</Link>)}
        <Link href="/login" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-medium text-slate-600 sm:hidden">{t("login")}</Link>
        <Link href="/submit" onClick={() => setOpen(false)} className="block rounded-lg bg-primary px-3 py-3 text-center text-sm font-semibold text-white">{t("submit")}</Link>
      </nav>}
    </header>
    <main>{children}</main>
    <footer className="border-t border-border bg-white">
      <div className="mx-auto max-w-[1280px] px-5 py-10 sm:px-8 lg:px-10">
        <div className="flex flex-col justify-between gap-7 md:flex-row md:items-start">
          <div><Link href="/" aria-label={t("home")}><PublicLogo /></Link><p className="mt-4 text-sm text-slate-500">{t("footer")}</p></div>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-4 text-xs text-slate-500"><Link className="hover:text-primary" href="/privacy">{t("privacy")}</Link><Link className="hover:text-primary" href="/track">{t("track")}</Link><Link className="hover:text-primary" href="/login">{t("login")}</Link></div>
        </div>
        <div className="mt-9 flex flex-col justify-between gap-3 border-t border-border pt-5 text-[11px] text-slate-400 sm:flex-row"><span>{t("copyright")}<span className="mx-2">/</span>{t("university")}</span><span>{demo ? t("demoNotice") : t("footerNote")}</span></div>
      </div>
    </footer>
  </div>;
}

export function DemoBadge({ className }: { className?: string }) {
  const t = useTranslations("nav");
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-800", className)}><span className="size-1.5 rounded-full bg-amber-500" />{t("demo")}</span>;
}
