"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { LayoutDashboard, MessagesSquare, ChartNoAxesCombined, ArrowUpRight, ShieldCheck, LogOut, Menu, X, ExternalLink } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requestJson } from "@/lib/client-api";
import type { AdminSession } from "@/lib/types";

export function AdminShell({ session, children }: { session: AdminSession; children: React.ReactNode }) {
  const t = useTranslations("admin");
  const org = useTranslations("organization");
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
  return <div className="min-h-screen bg-[#f6f5f1] text-[#242722]">
    <a href="#admin-main" className="sr-only z-50 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:rounded-md focus:bg-white focus:p-4">{t("overview")}</a>
    {menuOpen && <button className="fixed inset-0 z-30 bg-[#242722]/25 lg:hidden" aria-label={t("closeMenu")} onClick={() => setMenuOpen(false)} />}
    <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-[232px] flex-col border-r border-[#dedfd7] bg-[#fffefa] transition-transform lg:translate-x-0", menuOpen ? "translate-x-0" : "-translate-x-full")}>
      <div className="flex h-[82px] shrink-0 items-center justify-between bg-[#294b3c] px-6">
        <Link href="/" aria-label="UniVoice"><Brand inverse /></Link>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("closeMenu")} onClick={() => setMenuOpen(false)}><X /></Button>
      </div>
      <div className="mx-5 mb-7 flex items-start gap-3 border-y border-[#dedfd7] py-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[#d5d8cd] bg-[#e7e9e0] text-[10px] font-semibold text-[#515b4a]" aria-hidden="true">{String(org.raw("initials"))}</div>
        <div className="min-w-0"><p className="break-words text-xs font-medium leading-5" title={String(org.raw("name"))}>{String(org.raw("name"))}</p><p className="mt-0.5 text-[10px] text-[#74786e]">{t("workspace")}</p></div>
      </div>
      <p className="mb-2 px-6 text-[10px] font-medium tracking-[0.08em] text-[#74786e]">{t("navigation")}</p>
      <nav className="space-y-1 px-3" aria-label={t("navigation")}>
        {navigation.map(item => { const active = current?.href === item.href; return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] transition-colors", active ? "bg-[#315747] font-medium text-white" : "text-[#74786e] hover:bg-[#e8eae2] hover:text-[#242722]")}><item.icon className="size-[17px] shrink-0" strokeWidth={1.6} />{item.label}</Link>; })}
      </nav>
      <div className="mx-5 my-5 border-t border-[#dedfd7]" />
      <nav className="space-y-1 px-3" aria-label={t("publicProgress")}>
        <Link href="/issues" className="flex items-center gap-3 rounded-md px-3 py-3 text-xs text-[#74786e] hover:bg-[#e8eae2]"><ExternalLink className="size-4" strokeWidth={1.6} />{t("publicProgress")}<ArrowUpRight className="ml-auto size-3" /></Link>
        <Link href="/privacy" className="flex items-center gap-3 rounded-md px-3 py-3 text-xs text-[#74786e] hover:bg-[#e8eae2]"><ShieldCheck className="size-4" strokeWidth={1.6} />{t("privacy")}</Link>
      </nav>
      <div className="mt-auto px-6 pb-5 pt-8"><p className="text-[11px] leading-5 text-[#74786e]">{t("privateData")}</p></div>
      <div className="flex items-center gap-2.5 border-t border-[#dedfd7] px-5 py-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[#d5d8cd] bg-[#e7e9e0] text-xs font-medium text-[#515b4a]">{session.email.slice(0, 1).toUpperCase()}</div>
        <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium" title={session.email}>{session.email}</p><p className="mt-1 text-[10px] text-[#74786e]">{t(session.role === "admin" ? "administrator" : "moderator")}</p></div>
        <button onClick={logout} disabled={pending} aria-label={t("logout")} className="rounded-md p-2 text-[#74786e] hover:bg-[#e2e5da] hover:text-[#242722]"><LogOut className="size-4" /></button>
      </div>
    </aside>
    <div className="min-w-0 lg:pl-[232px]">
      <header className="flex h-[64px] items-center justify-between gap-4 border-b border-[#dedfd7] bg-[#f6f5f1] px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" className="-ml-2 lg:hidden" aria-label={t("menu")} onClick={() => setMenuOpen(true)}><Menu /></Button><p className="truncate text-xs text-[#74786e]"><span className="hidden sm:inline">{t("workspace")}<span className="mx-3 text-[#b8bcb0]">/</span></span><span className="text-[#242722]">{current?.label ?? t("issues")}</span></p></div>
        <div className="flex shrink-0 items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-0.5 rounded-md border border-[#dedfd7] p-0.5" role="group" aria-label={t("language")}>{["ru", "kk"].map(lang => <button key={lang} onClick={() => changeLanguage(lang)} disabled={pending} aria-pressed={locale === lang} className={cn("rounded px-2.5 py-1.5 text-[10px] font-medium", locale === lang ? "bg-white text-[#242722]" : "text-[#74786e] hover:text-[#242722]")}>{lang === "ru" ? "РУС" : "ҚАЗ"}</button>)}</div>
          <Link href="/" className="hidden items-center gap-1.5 text-xs text-[#74786e] hover:text-primary sm:flex">{t("backHome")}<ArrowUpRight className="size-3.5" /></Link>
        </div>
      </header>
      {error && <p role="alert" className="bg-red-50 p-3 text-center text-sm text-red-700">{t("error")}</p>}
      <main id="admin-main" className="mx-auto max-w-[1640px] p-5 sm:p-8 xl:px-9 xl:py-8">{children}</main>
    </div>
  </div>;
}
