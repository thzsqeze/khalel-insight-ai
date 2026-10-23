"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, ArrowUpRight, Check, Eye, EyeOff, LayoutDashboard, LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";
import { PublicLogo } from "./public-shell";
import { postPublic, PublicError, publicButtonClass, publicInputClass, publicLabelClass, Spinner } from "./public-shared";

export function PublicLogin() {
  const t = useTranslations("login");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validation, setValidation] = useState(false);
  async function login() {
    setError(""); setValidation(false);
    if (!email.trim() || !password) { setValidation(true); return; }
    setLoading(true);
    try {
      await postPublic<{ ok: true }>("/api/auth/login", { email: email.trim(), password });
      router.push("/admin"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "unknown"); setLoading(false); }
  }
  return <div className="mx-auto max-w-[1150px] px-5 py-10 sm:px-8 sm:py-16 lg:py-20">
    <div className="grid overflow-hidden rounded-2xl border border-border bg-[#fffefa] lg:grid-cols-[1fr_1fr]">
      <div className="relative border-b border-[#d8e1c5] bg-[#e8eedb] p-8 sm:p-12 lg:border-b-0 lg:border-r"><div className="relative"><PublicLogo /><p className="mt-14 text-xs font-semibold tracking-[1.7px] text-muted-foreground">{t("eyebrow")}</p><h1 className="mt-5 whitespace-pre-line text-[44px] font-medium leading-[1.05] tracking-[-2px] text-foreground sm:text-[54px]">{t("title")}</h1><p className="mt-5 max-w-xs text-sm leading-7 text-muted-foreground">{t("description")}</p><ul className="mt-9 space-y-4">{[1, 2, 3].map(n => <li key={n} className="flex items-center gap-3 text-xs leading-6 text-muted-foreground"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#fffefa]/10 text-muted-foreground"><Check className="size-3" /></span>{t(`feature${n}`)}</li>)}</ul><div className="mt-12 hidden items-center gap-2 border-t border-border pt-5 text-xs text-muted-foreground sm:flex"><LockKeyhole className="size-3" />{t("accessNote")}</div></div></div>
      <div className="flex flex-col justify-center p-6 sm:p-12">
        <span className="mb-5 grid size-11 place-items-center rounded-xl bg-[#f0f0e9] text-muted-foreground"><LayoutDashboard className="size-5" strokeWidth={1.5} /></span><h2 className="text-2xl font-semibold tracking-[-0.7px] text-foreground">{t("formTitle")}</h2><p className="mt-3 text-xs leading-6 text-muted-foreground">{t("formDescription")}</p>
        <form onSubmit={event => { event.preventDefault(); void login(); }} className="mt-7 space-y-5"><div><label htmlFor="login-email" className={publicLabelClass}>{t("email")}</label><input id="login-email" type="email" required autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} className={publicInputClass} placeholder={t("emailPlaceholder")} /></div><div><label htmlFor="login-password" className={publicLabelClass}>{t("password")}</label><div className="relative"><input id="login-password" type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className={cn(publicInputClass, "pr-12")} /><button type="button" className="absolute right-1 top-1 grid size-10 place-items-center rounded-xl text-muted-foreground hover:text-foreground" aria-label={t(showPassword ? "hidePassword" : "showPassword")} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>{validation && <p role="alert" className="text-xs text-red-700">{t("validation")}</p>}{error && <PublicError error={error} />}<button type="submit" disabled={loading} className={cn(publicButtonClass, "w-full")}>{loading ? <Spinner /> : null}{t(loading ? "signingIn" : "button")}{!loading && <ArrowRight className="size-4" />}</button><p className="text-xs leading-5 text-muted-foreground">{t("accessNote")}</p></form>
        <div className="mt-8 border-t border-border pt-6"><p className="text-xs leading-6 text-muted-foreground">{t("anonymousNote")}</p><Link href="/submit" className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">{t("anonymousLink")}<ArrowUpRight className="size-3.5" /></Link></div>
      </div>
    </div>
  </div>;
}
