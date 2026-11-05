"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, requestJson } from "@/lib/client-api";

export function InvitationSetup() {
  const t = useTranslations("team");
  const [tokens, setTokens] = useState<{ accessToken: string; refreshToken: string } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get("access_token");
    const refreshToken = fragment.get("refresh_token");
    const type = fragment.get("type");
    // Fragments never reach the server. Remove them before rendering anything
    // interactive; tokens remain only in memory until the same-origin POST.
    window.history.replaceState(null, "", window.location.pathname);
    Promise.resolve().then(() => {
      if ((type === "invite" || type === "recovery") && accessToken && refreshToken)
        setTokens({ accessToken, refreshToken });
      else setError("invitation_expired");
    });
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!tokens || busy) return;
    if (password !== confirmation) {
      setError("password_mismatch");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await requestJson("/api/auth/setup-password", {
        method: "POST",
        body: JSON.stringify({ ...tokens, password }),
      });
      setTokens(null);
      setPassword("");
      setConfirmation("");
      setDone(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.code : "unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="public-container min-h-dvh bg-[#f5f6f1] py-12 sm:py-20">
      <section className="grid gap-8 rounded-2xl border border-border bg-white p-6 sm:p-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <ShieldCheck className="mb-5 size-9 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">
            {t(done ? "passwordReady" : "setupTitle")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {t(done ? "passwordReadyBody" : "setupBody")}
          </p>
        </div>
        {done ? (
          <Button asChild className="mt-6">
            <Link href="/login">{t("signIn")}</Link>
          </Button>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-medium">
              {t("password")}
              <Input
                className="mt-2"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={!tokens || busy}
              />
            </label>
            <label className="block text-sm font-medium">
              {t("confirmPassword")}
              <Input
                className="mt-2"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
                disabled={!tokens || busy}
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {t.has(`errors.${error}`) ? t(`errors.${error}`) : t("errors.unavailable")}
              </p>
            )}
            <Button className="w-full" disabled={!tokens || busy}>
              {t(busy ? "saving" : "setPassword")}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
