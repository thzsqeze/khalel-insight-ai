"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { createContext, useContext, useRef, useState, useSyncExternalStore } from "react";
import { Settings2, ShieldCheck, X } from "lucide-react";
import { COOKIE_CONSENT_EVENT, COOKIE_CONSENT_NAME, readCookieConsent, type CookieConsent } from "@/lib/cookie-consent";
import { cn } from "@/lib/utils";

type ConsentSnapshot = CookieConsent | null | "unavailable" | "loading";

function getConsentSnapshot(): ConsentSnapshot {
  try { return readCookieConsent(document.cookie); }
  catch { return "unavailable"; }
}

function getServerConsentSnapshot(): ConsentSnapshot { return "loading"; }

function subscribeToConsent(onChange: () => void) {
  const onVisibility = () => { if (document.visibilityState === "visible") onChange(); };
  window.addEventListener(COOKIE_CONSENT_EVENT, onChange);
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onVisibility);
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(COOKIE_CONSENT_EVENT) : null;
  if (channel) channel.onmessage = onChange;
  return () => {
    channel?.close();
    window.removeEventListener(COOKIE_CONSENT_EVENT, onChange);
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

const ConsentContext = createContext<{ openSettings: (trigger: HTMLButtonElement, returnFocusId?: string) => void; isOpen: boolean } | null>(null);

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("cookies");
  const snapshot = useSyncExternalStore(subscribeToConsent, getConsentSnapshot, getServerConsentSnapshot);
  const [opened, setOpened] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [savedChoice, setSavedChoice] = useState<CookieConsent | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const fallbackOpener = useRef<string | undefined>(undefined);
  const consent = snapshot === "required" || snapshot === "diagnostics" ? snapshot : null;
  const isOpen = snapshot !== "loading" && (opened || consent === null);

  function openSettings(trigger: HTMLButtonElement, returnFocusId?: string) {
    opener.current = trigger;
    fallbackOpener.current = returnFocusId;
    setOpened(true);
    setSaveError(false);
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
    });
  }

  function closeSettings() {
    setOpened(false);
    // The admin menu may have closed after opening these nonmodal settings.
    const trigger = opener.current;
    if (trigger && trigger.getBoundingClientRect().right > 0) trigger.focus({ preventScroll: true });
    else if (fallbackOpener.current) document.getElementById(fallbackOpener.current)?.focus({ preventScroll: true });
  }

  function save(next: CookieConsent) {
    setSaveError(false);
    try {
      document.cookie = `${COOKIE_CONSENT_NAME}=v1.${next}; Path=/; Max-Age=15552000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      if (readCookieConsent(document.cookie) !== next) throw new Error("Consent was not persisted");
      window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT));
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel(COOKIE_CONSENT_EVENT);
        channel.postMessage("changed");
        channel.close();
      }
      setSavedChoice(next);
      closeSettings();
    } catch { setSaveError(true); }
  }

  const choiceClass = "min-h-11 rounded-lg border border-primary bg-[#fffefa] px-4 py-3 text-xs font-semibold leading-5 text-primary transition hover:bg-[#e9ede5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  return <ConsentContext.Provider value={{ openSettings, isOpen }}>
    {isOpen && <section id="cookie-settings" aria-labelledby="cookie-settings-title" className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[60] mx-auto max-h-[80dvh] max-w-5xl overflow-y-auto overscroll-contain rounded-2xl border border-[#cbd4c4] bg-[#eef1e8] text-foreground shadow-[0_12px_48px_rgba(31,49,39,0.18)] sm:inset-x-6 sm:bottom-6">
      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-[#dce8bd] text-primary" aria-hidden="true"><ShieldCheck className="size-[18px]" strokeWidth={1.6} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h2 id="cookie-settings-title" ref={heading} tabIndex={-1} className="text-sm font-semibold leading-7 text-primary focus:outline-none">{t("title")}</h2>
              {opened && consent !== null && <button type="button" aria-label={t("close")} onClick={closeSettings} className="grid min-h-9 min-w-9 place-items-center rounded-md text-primary hover:bg-[#dfe5d5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><X className="size-4" /></button>}
            </div>
            <div className="mt-1 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-6">
              <div className="max-w-2xl text-xs leading-6 text-[#515b4a]">
                <p>{t("description")} <Link href="/privacy" className="font-medium text-primary underline underline-offset-4">{t("privacyLink")}</Link></p>
                {opened && <div className="mt-3 space-y-2">
                  <p><span className="font-semibold text-primary">{t("requiredTitle")}</span> {t("requiredDescription")}</p>
                  <p><span className="font-semibold text-primary">{t("diagnosticsTitle")}</span> {t("diagnosticsDescription")}</p>
                  <p className="font-medium text-primary">{t(consent === "diagnostics" ? "statusDiagnostics" : "statusRequired")}</p>
                </div>}
                <p className="mt-1 text-[11px]">{t("retention")}</p>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-[340px]">
                <button type="button" className={choiceClass} onClick={() => save("required")}>{t("requiredOnly")}</button>
                <button type="button" className={choiceClass} onClick={() => save("diagnostics")}>{t("allowDiagnostics")}</button>
              </div>
            </div>
            {(snapshot === "unavailable" || saveError) && <p role="alert" className="mt-3 max-w-2xl text-xs leading-6 text-red-800">{t(saveError ? "saveError" : "readError")}</p>}
          </div>
        </div>
      </div>
    </section>}
    {children}
    <p role="status" className="sr-only">{savedChoice && t(savedChoice === "diagnostics" ? "savedDiagnostics" : "savedRequired")}</p>
  </ConsentContext.Provider>;
}

export function CookieSettingsButton({ className, icon = false, onOpen, returnFocusId }: { className?: string; icon?: boolean; onOpen?: () => void; returnFocusId?: string }) {
  const t = useTranslations("cookies");
  const context = useContext(ConsentContext);
  if (!context) return null;
  return <button type="button" aria-controls="cookie-settings" aria-expanded={context.isOpen} className={cn("text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary", className)} onClick={event => { context.openSettings(event.currentTarget, returnFocusId); onOpen?.(); }}>
    {icon && <Settings2 className="size-4 shrink-0" strokeWidth={1.6} aria-hidden="true" />}{t("settings")}
  </button>;
}
