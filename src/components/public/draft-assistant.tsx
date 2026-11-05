"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Check, MessageSquareText, RotateCcw, WandSparkles } from "lucide-react";
import type { Category, Locale } from "@/lib/types";
import { ApiError, requestJson } from "@/lib/client-api";
import { draftAssistantResponseSchema, type DraftAssistantResponse } from "@/lib/draft-assistant";
import { cn } from "@/lib/utils";
import { Spinner } from "./public-shared";

type Snapshot = { description: string; locale: Locale };
type Outcome = Snapshot & { id: number; result?: DraftAssistantResponse; error?: string };
const controlClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";

export function DraftAssistant({
  description,
  category,
  locale,
  startedAt,
  website,
  onApplyDraft,
  onApplyCategory,
}: {
  description: string;
  category?: Category;
  locale: Locale;
  startedAt: number;
  website: string;
  onApplyDraft: (draft: string) => void;
  onApplyCategory: (category: Category) => void;
}) {
  const t = useTranslations("draftAssistant");
  const c = useTranslations("commonPublic.categories");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState<(Snapshot & { abort: AbortController }) | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [applied, setApplied] = useState<{ id: number; original: string; draft: string } | null>(
    null,
  );
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    return () => {
      controller.current?.abort();
      generation.current += 1;
    };
  }, [description, locale]);

  const busy =
    consent &&
    pending?.description === description &&
    pending.locale === locale &&
    !pending.abort.signal.aborted;
  const appliedCurrent = applied?.id === outcome?.id && applied?.draft === description;
  const current =
    consent && outcome?.locale === locale && (outcome.description === description || appliedCurrent)
      ? outcome
      : null;
  const result = current?.result;
  const eligible = description.trim().length >= 20 && description.trim().length <= 5000;

  async function assist() {
    if (!consent || !eligible || busy) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const id = ++generation.current;
    const snapshot = { description, locale };
    setPending({ ...snapshot, abort });
    setOutcome(null);
    setApplied(null);
    try {
      const response = await requestJson<unknown>("/api/feedback/assist", {
        method: "POST",
        signal: abort.signal,
        body: JSON.stringify({ description, locale, assistantConsent: true, website, startedAt }),
      });
      const parsed = draftAssistantResponseSchema.safeParse(response);
      if (!parsed.success) throw new ApiError("assistant_invalid_response", 503);
      if (generation.current === id && !abort.signal.aborted)
        setOutcome({ ...snapshot, id, result: parsed.data });
    } catch (error) {
      if (generation.current === id && !abort.signal.aborted)
        setOutcome({
          ...snapshot,
          id,
          error: error instanceof ApiError ? error.code : "network",
        });
    } finally {
      if (generation.current === id) setPending(null);
    }
  }

  function changeConsent(value: boolean) {
    controller.current?.abort();
    generation.current += 1;
    setConsent(value);
    setPending(null);
    setOutcome(null);
    setApplied(null);
  }

  return (
    <section
      aria-labelledby="draft-assistant-title"
      className="rounded-xl border border-[#d5dfd2] bg-[#f5f8f2] p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-primary">
          <WandSparkles className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="draft-assistant-title" className="text-sm font-semibold text-foreground">
              {t("title")}
            </h3>
            <span className="text-[11px] text-muted-foreground">{t("optional")}</span>
          </div>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      <label
        htmlFor="draft-assistant-consent"
        className="mt-4 flex cursor-pointer items-start gap-2.5 text-xs font-medium leading-6"
      >
        <input
          id="draft-assistant-consent"
          type="checkbox"
          checked={consent}
          onChange={(event) => changeConsent(event.target.checked)}
          aria-describedby="draft-assistant-privacy"
          className="mt-1 size-4 shrink-0 accent-primary"
        />
        {t("consent")}
      </label>
      <p
        id="draft-assistant-privacy"
        className="ml-[26px] mt-1 text-[11px] leading-5 text-muted-foreground"
      >
        {t("privacy")}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          id="draft-assistant-request"
          type="button"
          disabled={!consent || !eligible || busy}
          onClick={assist}
          className={cn(controlClass, "bg-primary text-white hover:bg-[#243e32]")}
        >
          {busy ? <Spinner /> : <WandSparkles className="size-3.5" aria-hidden="true" />}
          {t(busy ? "loading" : "request")}
        </button>
        {!eligible && <p className="text-[11px] text-muted-foreground">{t("minimum")}</p>}
      </div>
      <div aria-live="polite" aria-busy={busy}>
        {current?.error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-6 text-red-800"
          >
            {t(`errors.${t.has(`errors.${current.error}`) ? current.error : "unknown"}`)}
          </p>
        )}
        {consent && outcome && !current && (
          <p className="mt-3 text-xs leading-6 text-muted-foreground">{t("changed")}</p>
        )}
        {result && (
          <div
            id="draft-assistant-result"
            className="mt-5 space-y-4 border-t border-[#d5dfd2] pt-5"
          >
            <div>
              <h4 className="text-xs font-semibold">{t("suggestion")}</h4>
              <p className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-border bg-white p-4 text-sm leading-7">
                {result.draft}
              </p>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{t("review")}</p>
              {result.redacted && (
                <p className="mt-2 text-[11px] leading-5 text-[#80652e]">{t("redacted")}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  id="draft-assistant-apply"
                  type="button"
                  disabled={appliedCurrent}
                  onClick={() => {
                    if (!current || !result) return;
                    setApplied({ id: current.id, original: description, draft: result.draft });
                    onApplyDraft(result.draft);
                  }}
                  className={cn(
                    controlClass,
                    "border border-border bg-white text-primary hover:bg-[#edf3e8]",
                  )}
                >
                  <Check className="size-3.5" aria-hidden="true" />
                  {t(appliedCurrent ? "applied" : "apply")}
                </button>
                {appliedCurrent && applied && (
                  <button
                    id="draft-assistant-undo"
                    type="button"
                    onClick={() => {
                      onApplyDraft(applied.original);
                      setApplied(null);
                    }}
                    className={cn(controlClass, "text-muted-foreground hover:text-primary")}
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                    {t("undo")}
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
              <p className="text-xs">
                <span className="text-muted-foreground">{t("category")} </span>
                {c(result.suggestedCategory)}
              </p>
              <button
                id="draft-assistant-category"
                type="button"
                disabled={category === result.suggestedCategory}
                onClick={() => onApplyCategory(result.suggestedCategory)}
                className={cn(controlClass, "text-primary hover:bg-[#edf3e8]")}
              >
                {t(category === result.suggestedCategory ? "categoryApplied" : "useCategory")}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </button>
            </div>
            {result.questionIds.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-xs font-semibold">
                  <MessageSquareText className="size-3.5" aria-hidden="true" />
                  {t("questionsTitle")}
                </h4>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-6 text-muted-foreground">
                  {result.questionIds.map((id) => (
                    <li key={id}>{t(`questions.${id}`)}</li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                  {t("questionsHint")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
