"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { AudioLines, LayoutDashboard, MessagesSquare, ChartNoAxesCombined, ArrowUpRight, ShieldCheck, LogOut, Menu, X, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requestJson } from "@/lib/client-api";
import type { AdminSession } from "@/lib/types";

export function AdminShell({ session, children }: { session: AdminSession; children: React.ReactNode }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const navigation = [
    { href: "/admin", label: t("overview"), icon: LayoutDashboard },
    { href: "/admin/issues", label: t("issues"), icon: MessagesSquare },
    { href: "/admin/analytics", label: t("analytics"), icon: ChartNoAxesCombined },
  ];
  const current = navigation.find(item => item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href));
  async function changeLanguage(next: string) {
    setPending(true); setError(false);
    try { await requestJson("/api/locale", { method: "POST", body: JSON.stringify({ locale: next }) }); router.refresh(); }
    catch { setError(true); } finally { setPending(false); }
  }
  async function logout() {
    setPending(true); setError(false);
    try { await requestJson("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); }
    catch { setError(true); setPending(false); }
  }
  return <div className="min-h-screen">
    <a href="#admin-main" className="sr-only z-50 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:rounded-lg focus:bg-white focus:p-4">{t("overview")}</a>
    {menuOpen && <button className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-xs lg:hidden" aria-label={t("closeMenu")} onClick={() => setMenuOpen(false)} />}
    <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-border bg-white transition-transform lg:translate-x-0", menuOpen ? "translate-x-0" : "-translate-x-full")}>
      <div className="flex h-[83px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Khalel Insight AI">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm"><AudioLines className="size-5" strokeWidth={2} /></span>
          <span className="text-[20px] font-semibold tracking-[-1px]">khalel<span className="ml-1 font-normal text-primary">insight</span><span className="ml-1.5 align-top text-[9px] font-semibold tracking-normal text-primary">AI</span></span>
        </Link>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("closeMenu")} onClick={() => setMenuOpen(false)}><X /></Button>
      </div>
      <div className="mx-4 mb-8 flex items-center gap-3 rounded-xl border border-border bg-[#fafbfc] p-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600">AU</div>
        <div className="min-w-0"><p className="truncate text-[11px] font-semibold">{t("university")}</p><p className="mt-0.5 truncate text-[9px] text-muted-foreground">{t("universityFull")}</p></div>
      </div>
      <p className="mb-3 px-6 text-[9px] font-semibold tracking-[1.5px] text-slate-400">{t("navigation")}</p>
      <nav className="space-y-1.5 px-3" aria-label={t("navigation")}>
        {navigation.map(item => { const active = current?.href === item.href; return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-lg px-3 py-3 text-[12px] font-medium transition-colors", active ? "bg-[#eaf5f1] text-primary" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}><item.icon className="size-[17px]" strokeWidth={1.8} />{item.label}{active && <span className="ml-auto size-1.5 rounded-full bg-primary" />}</Link>; })}
      </nav>
      <div className="mx-5 my-6 border-t border-border" />
      <nav className="space-y-1 px-3">
        <Link href="/issues" className="flex items-center gap-3 rounded-lg px-3 py-3 text-xs text-slate-500 hover:bg-slate-50"><ExternalLink className="size-4" />{t("publicProgress")}<ArrowUpRight className="ml-auto size-3" /></Link>
        <Link href="/privacy" className="flex items-center gap-3 rounded-lg px-3 py-3 text-xs text-slate-500 hover:bg-slate-50"><ShieldCheck className="size-4" />{t("privacy")}</Link>
      </nav>
      <div className="mt-auto p-4">
        <div className="relative overflow-hidden rounded-xl bg-[#eef7f3] p-4">
          <Sparkles className="mb-3 size-5 text-primary" />
          <p className="max-w-40 text-xs font-semibold leading-relaxed text-[#225c4d]">{t("helpTitle")}</p>
          <p className="mt-2 text-[10px] leading-relaxed text-[#6b8b7d]">{t("helpBody")}</p>
          <Button size="sm" variant="outline" className="mt-4 w-full border-[#d6e9e0] bg-white/70 text-primary" asChild><Link href="/submit">{t("submit")}<ArrowUpRight /></Link></Button>
        </div>
      </div>
      <div className="flex items-center gap-2.5 border-t border-border px-5 py-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#ddeee7] text-xs font-semibold text-[#3f6b58]">{session.demo ? "Д" : session.email.slice(0, 1).toUpperCase()}</div>
        <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold">{session.demo ? t("demoAccount") : session.email}</p><p className="mt-1 text-[10px] text-muted-foreground">{t(session.role === "admin" ? "administrator" : "moderator")}</p></div>
        <button onClick={logout} disabled={pending} aria-label={t("logout")} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><LogOut className="size-4" /></button>
      </div>
    </aside>
    <div className="lg:pl-[248px]">
      <header className="flex h-[70px] items-center justify-between gap-4 border-b border-border bg-white px-5 sm:px-8">
        <div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="-ml-2 lg:hidden" aria-label={t("menu")} onClick={() => setMenuOpen(true)}><Menu /></Button><p className="hidden text-xs text-slate-400 sm:block">{t("workspace")}<span className="mx-3 text-slate-300">/</span><span className="text-slate-700">{current?.label ?? t("issues")}</span></p></div>
        <div className="flex items-center gap-3 sm:gap-6">
          <span className="hidden items-center gap-1.5 text-[10px] text-slate-400 xl:flex"><span className="size-1.5 rounded-full bg-emerald-500" />{t("secureWorkspace")}</span>
          <div className="flex items-center rounded-md bg-slate-100 p-0.5" role="group" aria-label={t("language")}>{["ru", "kk"].map(lang => <button key={lang} onClick={() => changeLanguage(lang)} disabled={pending} aria-pressed={locale === lang} className={cn("rounded px-2.5 py-1.5 text-[10px] font-semibold transition-all", locale === lang ? "bg-white text-slate-800 shadow-xs" : "text-slate-400 hover:text-slate-700")}>{lang === "ru" ? "РУС" : "ҚАЗ"}</button>)}</div>
          <Link href="/" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary">{t("backHome")}<ArrowUpRight className="size-3.5" /></Link>
          <div className="hidden size-8 items-center justify-center rounded-full border-2 border-white bg-[#ddeee7] text-[11px] font-semibold text-primary ring-1 ring-slate-100 sm:flex">{session.demo ? "Д" : session.email.slice(0, 1).toUpperCase()}</div>
        </div>
      </header>
      {session.demo && <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-[#e4ede3] bg-[#f2f7ec] px-5 py-2 text-center text-[10px] text-[#687b53]"><span className="font-semibold">{t("demoBanner")}</span><span className="hidden h-3 w-px bg-[#d8e3cc] sm:block" /><span>{t("demoDescription")}</span></div>}
      {error && <p role="alert" className="bg-red-50 p-3 text-center text-sm text-red-700">{t("error")}</p>}
      <main id="admin-main" className="mx-auto max-w-[1700px] p-5 sm:p-8 xl:px-10 xl:py-8">{children}</main>
    </div>
  </div>;
}
