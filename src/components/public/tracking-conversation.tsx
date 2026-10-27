"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MessageSquare, Send, ShieldCheck } from "lucide-react";
import type { TrackingResult } from "@/lib/types";
import { formatDate, cn } from "@/lib/utils";
import {
  postPublic,
  PublicError,
  publicButtonClass,
  publicInputClass,
  Spinner,
} from "./public-shared";

export function TrackingConversation({
  result,
  code,
  onUpdate,
}: {
  result: TrackingResult;
  code: string;
  onUpdate: (result: TrackingResult) => void;
}) {
  const t = useTranslations("trackConversation");
  const locale = useLocale();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !body.trim()) return;
    setBusy(true);
    setError("");
    setSent(false);
    try {
      await postPublic("/api/track/messages", { code, body: body.trim() });
      setBody("");
      setSent(true);
      const next = await postPublic<TrackingResult>("/api/track", { code });
      onUpdate(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-8 border-t border-border pt-7">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold">{t("title")}</h3>
      </div>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">{t("description")}</p>
      <ol className="mt-5 space-y-3">
        {(result.messages ?? []).map((message) => (
          <li
            key={message.id}
            className={cn(
              "rounded-xl border p-4",
              message.kind === "reply" ? "border-[#d4e0d2] bg-[#edf3e9]" : "border-border bg-white",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-foreground">
                {t(message.kind === "reply" ? "staff" : "you")}
              </span>
              <time dateTime={message.createdAt} className="text-muted-foreground">
                {formatDate(message.createdAt, locale)}
              </time>
            </div>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{message.body}</p>
          </li>
        ))}
      </ol>
      {!result.messages?.length && (
        <p className="mt-5 rounded-xl border border-dashed border-border p-5 text-xs leading-6 text-muted-foreground">
          {t("empty")}
        </p>
      )}
      <form onSubmit={submit} className="mt-6">
        <label htmlFor="tracking-follow-up" className="text-xs font-semibold">
          {t("label")}
        </label>
        <textarea
          id="tracking-follow-up"
          rows={4}
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            setSent(false);
          }}
          minLength={1}
          maxLength={5000}
          required
          disabled={busy}
          className={cn(publicInputClass, "mt-2 resize-y py-3")}
          placeholder={t("placeholder")}
          aria-describedby="followup-help"
        />
        <p
          id="followup-help"
          className="mt-2 flex items-start gap-2 text-xs leading-6 text-muted-foreground"
        >
          <ShieldCheck className="mt-1 size-3.5 shrink-0" />
          {t("privacy")}
        </p>
        {error && <PublicError error={error} className="mt-3" />}
        {sent && (
          <p role="status" className="mt-3 text-xs text-primary">
            {t("sent")}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !body.trim()}
          className={cn(publicButtonClass, "mt-4")}
        >
          {busy ? <Spinner /> : <Send className="size-4" />}
          {t(busy ? "sending" : "send")}
        </button>
      </form>
    </div>
  );
}
