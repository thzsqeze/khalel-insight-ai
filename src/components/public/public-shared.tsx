"use client";

import { AlertCircle, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Status } from "@/lib/types";

const knownErrors = new Set(["invalid_input", "unauthorized", "forbidden", "rate_limited", "not_found", "unavailable", "network", "unknown"]);
export function safeError(error: unknown): string {
  if (typeof error !== "string") return "unknown";
  return knownErrors.has(error) ? error : "unknown";
}

export async function postPublic<T>(url: string, data: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); }
  catch { throw new Error("network"); }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(safeError(payload.error));
  return payload as T;
}

export function PublicError({ error, className }: { error: string; className?: string }) {
  const t = useTranslations("commonPublic");
  return <div role="alert" className={cn("flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800", className)}><AlertCircle className="mt-0.5 size-4 shrink-0" /><span>{t(`errors.${safeError(error)}`)}</span></div>;
}

export function StatusPill({ status }: { status: Status }) {
  const t = useTranslations("commonPublic");
  return <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-xl border border-current/10 px-2 py-1 text-xs font-medium", { "bg-[#eeeee8] text-[#6c7366]": status === "new", "bg-[#f2eddb] text-[#8b753c]": status === "under_review", "bg-[#e7ece6] text-[#526b52]": status === "in_progress", "bg-[#e1eadb] text-[#3e673b]": status === "resolved" })}><span className="size-1.5 rounded-full bg-current" />{t(`statuses.${status}`)}</span>;
}

export const publicButtonClass = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white transition hover:bg-[#243e32] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60";
export const publicOutlineClass = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-[#fffefa] px-6 py-3 text-sm font-medium text-foreground transition hover:border-primary/30 hover:bg-[#eeeee6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-60";
export const publicInputClass = "h-12 w-full rounded-xl border border-border bg-[#fffefa] px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-3 focus:ring-primary/10 aria-invalid:border-red-400";
export const publicLabelClass = "mb-2 block text-sm font-medium text-foreground";
export function Spinner() { return <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />; }
