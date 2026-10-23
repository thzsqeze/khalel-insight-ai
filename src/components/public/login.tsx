"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, ArrowUpRight, Check, Eye, EyeOff, LayoutDashboard, LockKeyhole, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { DemoBadge, PublicLogo } from "./public-shell";
import { postPublic, PublicError, publicButtonClass, publicInputClass, publicLabelClass, Spinner } from "./public-shared";

export function PublicLogin({ demo }: { demo: boolean }) {
  const t = useTranslations("login");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validation, setValidation] = useState(false);
  async function login(useDemo: boolean) {
    setError(""); setValidation(false);
    if (!useDemo && (!email.trim() || !password)) { setValidation(true); return; }
    setLoading(true);
    try {
      await postPublic<{ ok: true }>("/api/auth/login", useDemo ? { demo: true } : { email: email.trim(), password });
      router.push("/admin"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "unknown"); setLoading(false); }
  }
  return <div className="mx-auto max-w-[1150px] px-5 py-10 sm:px-8 sm:py-16 lg:py-20">
    <div className="grid overflow-hidden rounded-3xl border border-border bg-white shadow-[0_18px_60px_-35px_#183f3540] lg:grid-cols-[1fr_1fr]">
      <div className="relative overflow-hidden bg-[#113f36] p-8 sm:p-12"><div aria-hidden="true" className="absolute -bottom-24 -right-24 size-80 rounded-full border border-white/10" /><div aria-hidden="true" className="absolute -bottom-10 -right-10 size-52 rounded-full border border-white/8" /><div className="relative"><PublicLogo inverse /><p className="mt-14 text-[9px] font-semibold tracking-[1.7px] text-teal-200/60">{t("eyebrow")}</p><h1 className="mt-5 whitespace-pre-line text-4xl font-medium leading-[1.15] tracking-[-1.4px] text-white">{t("title")}</h1><p className="mt-5 max-w-xs text-sm leading-7 text-teal-100/55">{t("description")}</p><ul className="mt-9 space-y-4">{[1, 2, 3].map(n => <li key={n} className="flex items-center gap-3 text-[11px] leading-6 text-teal-100/75"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/10 text-teal-200"><Check className="size-3" /></span>{t(`feature${n}`)}</li>)}</ul><div className="mt-12 hidden items-center gap-2 border-t border-white/10 pt-5 text-[10px] text-teal-100/40 sm:flex"><LockKeyhole className="size-3" />{t("accessNote")}</div></div></div>
      <div className="flex flex-col justify-center p-6 sm:p-12">
        <span className="mb-5 grid size-11 place-items-center rounded-xl bg-slate-50 text-slate-500"><LayoutDashboard className="size-5" strokeWidth={1.5} /></span><h2 className="text-2xl font-semibold tracking-[-0.7px] text-slate-800">{t("formTitle")}</h2><p className="mt-3 text-xs leading-6 text-slate-500">{t("formDescription")}</p>
        {demo ? <div className="mt-7"><DemoBadge /><h3 className="mt-5 text-base font-semibold text-slate-700">{t("demoTitle")}</h3><p className="mt-3 text-xs leading-7 text-slate-500">{t("demoDescription")}</p>{error && <PublicError error={error} className="mt-4" />}<button type="button" className={cn(publicButtonClass, "mt-6 w-full")} disabled={loading} onClick={() => login(true)}>{loading ? <Spinner /> : <Sparkles className="size-4" />}{t(loading ? "signingIn" : "demoButton")}{!loading && <ArrowRight className="size-4" />}</button><p className="mt-4 text-[10px] leading-5 text-slate-400">{t("demoNote")}</p></div> : <form onSubmit={event => { event.preventDefault(); void login(false); }} className="mt-7 space-y-5"><div><label htmlFor="login-email" className={publicLabelClass}>{t("email")}</label><input id="login-email" type="email" required autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} className={publicInputClass} placeholder={t("emailPlaceholder")} /></div><div><label htmlFor="login-password" className={publicLabelClass}>{t("password")}</label><div className="relative"><input id="login-password" type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className={cn(publicInputClass, "pr-12")} /><button type="button" className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-slate-400 hover:text-slate-700" aria-label={t(showPassword ? "hidePassword" : "showPassword")} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>{validation && <p role="alert" className="text-xs text-red-700">{t("validation")}</p>}{error && <PublicError error={error} />}<button type="submit" disabled={loading} className={cn(publicButtonClass, "w-full")}>{loading ? <Spinner /> : null}{t(loading ? "signingIn" : "button")}{!loading && <ArrowRight className="size-4" />}</button><p className="text-[10px] leading-5 text-slate-400">{t("accessNote")}</p></form>}
        <div className="mt-8 border-t border-border pt-6"><p className="text-[11px] leading-6 text-slate-400">{t("anonymousNote")}</p><Link href="/submit" className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">{t("anonymousLink")}<ArrowUpRight className="size-3.5" /></Link></div>
      </div>
    </div>
  </div>;
}
