"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/brand";

export function PublicLogo({ inverse = false }: { inverse?: boolean }) {
  return <Brand inverse={inverse} />;
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const org = useTranslations("organization");
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
  const languages = <div className="inline-flex items-center gap-1" role="group" aria-label={t("language")}>
    {(["ru", "kk"] as const).map((lang) => <button key={lang} type="button" lang={lang} aria-pressed={locale === lang} disabled={switching} onClick={() => setLocale(lang)} className={cn("min-h-9 min-w-9 border-b px-1 text-xs font-medium transition-colors disabled:opacity-50", locale === lang ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-primary")}>{lang === "ru" ? "РУС" : "ҚАЗ"}</button>)}
  </div>;
  return <div className="min-h-screen bg-background text-foreground">
    <header className="relative z-30 border-b border-border bg-background">
      <div className="mx-auto flex h-[88px] max-w-[1320px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
        <Link href="/" aria-label={`UniVoice — ${t("home")}`} onClick={() => setOpen(false)}><PublicLogo /></Link>
        <span className="hidden max-w-[150px] border-l border-border pl-4 text-xs leading-4 text-muted-foreground xl:block">{org.raw("name")}</span>
        <nav className="hidden items-center gap-7 lg:flex" aria-label={t("home")}>
          {navItems.map((item) => <Link key={item.href} href={item.href} className={cn("text-xs font-medium text-muted-foreground transition hover:text-primary", pathname === item.href && "text-primary")} aria-current={pathname === item.href ? "page" : undefined}>{t(item.label)}</Link>)}
        </nav>
        <div className="flex items-center gap-3 sm:gap-5">
          {languages}
          <Link href="/login" className="hidden items-center gap-1.5 text-xs font-medium text-foreground transition hover:text-primary sm:flex">{t("login")}<ArrowUpRight className="size-3.5" /></Link>
          <button type="button" className="grid size-10 place-items-center rounded-xl border border-border text-muted-foreground lg:hidden" aria-label={t(open ? "closeMenu" : "openMenu")} aria-expanded={open} aria-controls="public-mobile-nav" onClick={() => setOpen(!open)}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        </div>
      </div>
      {localeError && <p role="alert" className="mx-auto max-w-[1320px] px-5 pb-2 text-xs text-red-700">{t("switchError")}</p>}
      {open && <nav id="public-mobile-nav" className="space-y-1 border-t border-border bg-background px-5 py-4 lg:hidden" aria-label={t("openMenu")}>
        {navItems.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-[#eeeee6]">{t(item.label)}</Link>)}
        <Link href="/login" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-sm font-medium text-foreground sm:hidden">{t("login")}</Link>
        <Link href="/submit" onClick={() => setOpen(false)} className="block rounded-xl bg-primary px-3 py-3 text-center text-sm font-semibold text-white">{t("submit")}</Link>
      </nav>}
    </header>
    <main>{children}</main>
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-[1320px] px-5 py-10 sm:px-8 lg:px-12">
        <div className="flex flex-col justify-between gap-7 md:flex-row md:items-start">
          <div><Link href="/" aria-label={t("home")}><PublicLogo /></Link><p className="mt-4 text-xs text-muted-foreground">{t("footer")}</p></div>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-4 text-xs text-muted-foreground"><Link className="hover:text-primary" href="/privacy">{t("privacy")}</Link><Link className="hover:text-primary" href="/track">{t("track")}</Link><Link className="hover:text-primary" href="/login">{t("login")}</Link></div>
        </div>
        <div className="mt-9 flex flex-col justify-between gap-3 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row"><span>{t("copyright")}<span className="mx-2">/</span>{org.raw("name")}</span><span>{t("footerNote")}</span></div>
      </div>
    </footer>
  </div>;
}
