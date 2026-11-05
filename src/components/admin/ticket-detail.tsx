"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  FileSearch,
  History,
  LockKeyhole,
  Mail,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { ApiError, requestJson, useRemote } from "@/lib/client-api";
import { priorities, statuses, type Priority, type Status } from "@/lib/types";
import type {
  Department,
  StaffMember,
  Ticket,
  TicketDetail as TicketDetailData,
  TicketEvent,
  TicketPatch,
  TicketQueue,
} from "@/lib/tickets";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataError, DashboardSkeleton, StatusBadge } from "./shared";
import { ReportReview } from "./report-review";

function timeLabel(date: string, locale: string) {
  return `${formatDate(date, locale)}, ${new Intl.DateTimeFormat(locale === "kk" ? "kk-KZ" : "ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Atyrau" }).format(new Date(date))}`;
}

export function TicketDetail({
  id,
  variant = "page",
  onDirtyChange,
  onUpdate,
}: {
  id: string;
  variant?: "page" | "drawer";
  onDirtyChange?: (dirty: boolean) => void;
  onUpdate?: () => void;
}) {
  const t = useTranslations("tickets");
  const a = useTranslations("admin");
  const c = useTranslations("categories");
  const errors = useTranslations("apiErrors");
  const locale = useLocale();
  const { data, error, loading, reload } = useRemote<TicketDetailData>(`/api/admin/tickets/${id}`);
  const directory = useRemote<TicketQueue>("/api/admin/tickets");
  const [view, setView] = useState<"conversation" | "history">("conversation");
  const [kind, setKind] = useState<"reply" | "note">("reply");
  const [drafts, setDrafts] = useState({ reply: "", note: "" });
  const [sending, setSending] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageSent, setMessageSent] = useState<"reply" | "note" | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [propertiesDirty, setPropertiesDirty] = useState(false);
  const [analysisDirty, setAnalysisDirty] = useState(false);
  useEffect(() => {
    onDirtyChange?.(Boolean(drafts.reply || drafts.note) || propertiesDirty || analysisDirty);
  }, [drafts, propertiesDirty, analysisDirty, onDirtyChange]);
  if (error) return <DataError error={error} retry={reload} />;
  if (!data) return <DashboardSkeleton />;
  const { ticket } = data;
  const messages = [...data.messages].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
  const staff = directory.data?.staff ?? [];
  const departments = directory.data?.departments ?? [];
  const authorName = (authorId: string | null) =>
    staff.find((person) => person.id === authorId)?.email ?? t("staffMember");
  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!drafts[kind].trim() || sending) return;
    const sendingKind = kind;
    setSending(true);
    setMessageError(null);
    setMessageSent(null);
    try {
      await requestJson(`/api/admin/tickets/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ kind: sendingKind, body: drafts[sendingKind].trim() }),
      });
      setDrafts((current) => ({ ...current, [sendingKind]: "" }));
      setMessageSent(sendingKind);
      reload();
      onUpdate?.();
    } catch (cause) {
      setMessageError(
        cause instanceof ApiError && errors.has(cause.code) ? errors(cause.code) : t("error"),
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <div className="space-y-5">
      {variant === "page" && (
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/admin/issues"
            className="inline-flex items-center gap-2 text-xs text-[#7a897f] transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-3.5" />
            {t("backToQueue")}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              reload();
              directory.reload();
            }}
            disabled={loading}
            className="text-[11px]"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
            {t("refresh")}
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-1">
        <div className="min-w-0 max-w-4xl">
          <div className="mb-2.5 flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-semibold tracking-wide text-[#78877e]">
              {ticket.reference}
            </span>
            <StatusBadge status={ticket.status} />
          </div>
          <h1
            id="ticket-detail-title"
            className="break-words text-xl font-semibold leading-[1.5] tracking-tight text-[#243f31] sm:text-[24px]"
          >
            {ticket.analysis?.summary || c(ticket.category)}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[#859087]">
            <span className="flex items-center gap-1.5">
              <UserRound className="size-3.5" />
              {a(ticket.role)} · {t("anonymousAuthor")}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock3 className="size-3.5" />
              <time dateTime={ticket.createdAt}>{timeLabel(ticket.createdAt, locale)}</time>
            </span>
            <span>{c(ticket.category)}</span>
          </div>
        </div>
      </div>
      <div
        className={cn(
          "grid min-w-0 items-start gap-5",
          variant === "drawer"
            ? "lg:grid-cols-[minmax(0,1fr)_260px]"
            : "xl:grid-cols-[minmax(0,1fr)_290px]",
        )}
      >
        <div className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-xl border border-[#e1e7e2] bg-white">
            <div
              className="flex gap-6 border-b border-[#e8ede9] px-5 sm:px-6"
              role="tablist"
              aria-label={t("ticketSections")}
            >
              {(["conversation", "history"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={view === tab}
                  onClick={() => setView(tab)}
                  className={cn(
                    "flex items-center gap-2 border-b-2 py-4 text-xs font-medium",
                    view === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-[#839087] hover:text-foreground",
                  )}
                >
                  {tab === "conversation" ? (
                    <MessageSquare className="size-3.5" />
                  ) : (
                    <History className="size-3.5" />
                  )}
                  {t(tab)}
                  <span className="rounded bg-[#f1f5f2] px-1.5 py-0.5 text-[10px] tabular-nums">
                    {tab === "conversation" ? messages.length + 1 : data.events.length}
                  </span>
                </button>
              ))}
            </div>
            {view === "conversation" ? (
              <div>
                <div className="divide-y divide-[#edf0ed]">
                  <article className="p-5 sm:p-6">
                    <MessageHeader
                      name={t("anonymousAuthor")}
                      label={t("originalMessage")}
                      date={ticket.createdAt}
                      locale={locale}
                    />
                    <p className="mt-4 max-w-[90ch] whitespace-pre-wrap break-words text-[13px] leading-7 text-[#485a4e]">
                      {ticket.description}
                    </p>
                    {ticket.faculty && (
                      <p className="mt-4 text-[11px] text-[#869188]">
                        {a("faculty")}: {ticket.faculty}
                      </p>
                    )}
                  </article>
                  {messages.map((message) => (
                    <article
                      key={message.id}
                      className={cn(
                        "p-5 sm:p-6",
                        message.kind === "note"
                          ? "bg-[#fffcf3]"
                          : message.kind === "reply"
                            ? "bg-[#f8fbf9]"
                            : "bg-white",
                      )}
                    >
                      <MessageHeader
                        name={
                          message.kind === "follow_up"
                            ? t("anonymousAuthor")
                            : authorName(message.authorId)
                        }
                        label={t(
                          message.kind === "note"
                            ? "internalNote"
                            : message.kind === "reply"
                              ? "staffReply"
                              : "authorFollowUp",
                        )}
                        date={message.createdAt}
                        locale={locale}
                        internal={message.kind === "note"}
                        staff={message.kind !== "follow_up"}
                      />
                      <p className="mt-4 max-w-[90ch] whitespace-pre-wrap break-words text-[13px] leading-7 text-[#485a4e]">
                        {message.body}
                      </p>
                    </article>
                  ))}
                </div>
                <form onSubmit={sendMessage} className="border-t border-[#e8ede9] p-5 sm:p-6">
                  <div
                    className="mb-4 flex items-center gap-1 rounded-lg bg-[#f3f6f3] p-1 sm:w-fit"
                    role="tablist"
                    aria-label={t("messageType")}
                  >
                    {(["reply", "note"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        role="tab"
                        aria-selected={kind === tab}
                        disabled={sending}
                        onClick={() => {
                          setKind(tab);
                          setMessageError(null);
                          setMessageSent(null);
                        }}
                        className={cn(
                          "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-xs font-medium transition-colors",
                          kind === tab
                            ? "bg-white text-primary shadow-sm"
                            : "text-[#7c8b80] hover:text-foreground",
                        )}
                      >
                        {tab === "reply" ? (
                          <MessageSquare className="size-3.5" />
                        ) : (
                          <LockKeyhole className="size-3.5" />
                        )}
                        {t(tab === "reply" ? "replyTab" : "noteTab")}
                      </button>
                    ))}
                  </div>
                  <Label htmlFor="ticket-message" className="sr-only">
                    {t(kind === "reply" ? "replyPlaceholder" : "notePlaceholder")}
                  </Label>
                  <Textarea
                    id="ticket-message"
                    value={drafts[kind]}
                    onChange={(event) => {
                      setDrafts((current) => ({ ...current, [kind]: event.target.value }));
                      setMessageSent(null);
                    }}
                    maxLength={5000}
                    required
                    disabled={sending}
                    placeholder={t(kind === "reply" ? "replyPlaceholder" : "notePlaceholder")}
                    aria-describedby="ticket-message-help"
                    className={cn(
                      "min-h-36 resize-y border-[#dfe7e1] p-4 text-[13px] leading-6 placeholder:text-[#a1aaa3]",
                      kind === "note" && "border-[#e8dfbd] bg-[#fffdf6]",
                    )}
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p
                      id="ticket-message-help"
                      className="flex max-w-md items-start gap-1.5 text-[10px] leading-5 text-[#87928a]"
                    >
                      {kind === "reply" ? (
                        <ShieldCheck className="mt-1 size-3 shrink-0" />
                      ) : (
                        <LockKeyhole className="mt-1 size-3 shrink-0" />
                      )}
                      {t(kind === "reply" ? "replyVisibility" : "noteVisibility")}
                    </p>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={sending || !drafts[kind].trim()}
                      className="h-9 px-4"
                    >
                      {sending ? (
                        <RefreshCw className="animate-spin" />
                      ) : kind === "reply" ? (
                        <Send />
                      ) : (
                        <LockKeyhole />
                      )}
                      {t(sending ? "sending" : kind === "reply" ? "sendReply" : "saveNote")}
                    </Button>
                  </div>
                  {messageError && (
                    <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-xs text-red-700">
                      {messageError}
                    </p>
                  )}
                  {messageSent && (
                    <p
                      role="status"
                      className="mt-3 flex items-center gap-1.5 text-xs text-primary"
                    >
                      <Check className="size-3.5" />
                      {t(messageSent === "reply" ? "replySent" : "noteSaved")}
                    </p>
                  )}
                </form>
              </div>
            ) : (
              <TicketHistory events={data.events} staff={staff} departments={departments} />
            )}
          </section>
          <section className="overflow-hidden rounded-xl border border-[#e1e7e2] bg-white">
            <button
              type="button"
              onClick={() => setAnalysisOpen(!analysisOpen)}
              aria-expanded={analysisOpen}
              aria-controls="ticket-analysis"
              className="flex w-full items-center gap-3 px-5 py-4 text-left sm:px-6"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#eef4ef] text-primary">
                <FileSearch className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#3d5144]">{t("analysisTitle")}</p>
                <p className="mt-1 text-[10px] leading-5 text-[#89948c]">{t("analysisHelp")}</p>
              </div>
              <ChevronDown
                className={cn(
                  "size-4 text-[#89948c] transition-transform",
                  analysisOpen && "rotate-180",
                )}
              />
            </button>
            <div
              id="ticket-analysis"
              hidden={!analysisOpen}
              className="border-t border-[#e8ede9] p-5 sm:p-6"
            >
              <ReportReview
                key={`${ticket.id}-${ticket.analysisStatus}-${JSON.stringify(ticket.analysis)}`}
                report={ticket}
                onDirtyChange={setAnalysisDirty}
                onUpdate={() => {
                  reload();
                  onUpdate?.();
                }}
                allowCreate
              />
            </div>
          </section>
        </div>
        <aside className="min-w-0 space-y-4">
          {directory.error ? (
            <DataError error={directory.error} retry={directory.reload} />
          ) : directory.data ? (
            <TicketProperties
              key={`${ticket.id}-${ticket.status}-${ticket.priority}-${ticket.departmentId}-${ticket.assigneeId}`}
              ticket={ticket}
              departments={departments}
              staff={staff}
              onDirtyChange={setPropertiesDirty}
              onUpdate={() => {
                reload();
                directory.reload();
                onUpdate?.();
              }}
            />
          ) : (
            <div
              role="status"
              className="rounded-xl border border-[#e1e7e2] bg-white p-5 text-xs text-muted-foreground"
            >
              {t("loadingProperties")}
            </div>
          )}
          <div className="rounded-xl border border-[#e1e7e2] bg-white p-5">
            <h2 className="text-xs font-semibold text-[#4c5f51]">{t("publicGroup")}</h2>
            <p className="mt-2 text-[11px] leading-6 text-[#869188]">{t("publicGroupHelp")}</p>
            {ticket.issueId ? (
              <Link
                href={`/admin/issues/${ticket.issueId}`}
                className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-primary"
              >
                {t("openPublicGroup")}
                <ArrowUpRight className="size-3.5" />
              </Link>
            ) : (
              <p className="mt-3 text-[11px] text-[#93a097]">{t("noPublicGroup")}</p>
            )}
          </div>
          <p className="flex items-start gap-2 px-1 text-[10px] leading-5 text-[#8c978f]">
            <ShieldCheck className="mt-1 size-3.5 shrink-0" />
            {t("privateWorkspace")}
          </p>
        </aside>
      </div>
    </div>
  );
}

function MessageHeader({
  name,
  label,
  date,
  locale,
  internal = false,
  staff = false,
}: {
  name: string;
  label: string;
  date: string;
  locale: string;
  internal?: boolean;
  staff?: boolean;
}) {
  return (
    <header className="flex items-start gap-3">
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          internal
            ? "bg-[#f4edd3] text-[#a18b49]"
            : staff
              ? "bg-[#e5efe7] text-primary"
              : "bg-[#f0f3f0] text-[#89968b]",
        )}
      >
        {internal ? (
          <LockKeyhole className="size-3.5" />
        ) : staff ? (
          <ShieldCheck className="size-4" />
        ) : (
          <UserRound className="size-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words text-xs font-semibold leading-5 text-[#45594b]">{name}</p>
        <p className={cn("mt-0.5 text-[10px]", internal ? "text-[#a28b49]" : "text-[#8a968c]")}>
          {label}
        </p>
      </div>
      <time dateTime={date} className="shrink-0 pt-1 text-[10px] tabular-nums text-[#97a197]">
        {timeLabel(date, locale)}
      </time>
    </header>
  );
}

function TicketProperties({
  ticket,
  departments,
  staff,
  onUpdate,
  onDirtyChange,
}: {
  ticket: Ticket;
  departments: Department[];
  staff: StaffMember[];
  onUpdate: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const t = useTranslations("tickets");
  const s = useTranslations("statuses");
  const p = useTranslations("priorities");
  const errors = useTranslations("apiErrors");
  const locale = useLocale();
  const [values, setValues] = useState({
    status: ticket.status,
    priority: ticket.priority,
    departmentId: ticket.departmentId ?? "",
    assigneeId: ticket.assigneeId ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [emailRequestId, setEmailRequestId] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const changed =
    values.status !== ticket.status ||
    values.priority !== ticket.priority ||
    values.departmentId !== (ticket.departmentId ?? "") ||
    values.assigneeId !== (ticket.assigneeId ?? "");
  useEffect(() => {
    onDirtyChange(changed);
    return () => onDirtyChange(false);
  }, [changed, onDirtyChange]);
  const department = departments.find((item) => item.id === ticket.departmentId);
  const selectClass = "h-9 w-full border-[#e0e7e1] text-xs text-[#4e6254]";
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const patch: TicketPatch = {};
    if (values.status !== ticket.status) patch.status = values.status;
    if (values.priority !== ticket.priority) patch.priority = values.priority;
    if (values.departmentId !== (ticket.departmentId ?? ""))
      patch.departmentId = values.departmentId || null;
    if (values.assigneeId !== (ticket.assigneeId ?? ""))
      patch.assigneeId = values.assigneeId || null;
    try {
      await requestJson(`/api/admin/tickets/${ticket.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setSaved(true);
      onUpdate();
    } catch (cause) {
      setError(
        cause instanceof ApiError && errors.has(cause.code) ? errors(cause.code) : t("error"),
      );
    } finally {
      setBusy(false);
    }
  }
  async function forwardEmail() {
    if (!emailRequestId || busy) return;
    setBusy(true);
    setEmailError(null);
    try {
      await requestJson(`/api/admin/tickets/${ticket.id}/forward`, {
        method: "POST",
        body: JSON.stringify({ requestId: emailRequestId }),
      });
      setEmailSent(true);
      setConfirmEmail(false);
      onUpdate();
    } catch (cause) {
      setEmailError(
        cause instanceof ApiError && errors.has(cause.code) ? errors(cause.code) : t("error"),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="overflow-hidden rounded-xl border border-[#e1e7e2] bg-white">
        <h2 className="border-b border-[#e8ede9] px-5 py-4 text-xs font-semibold text-[#44584b]">
          {t("properties")}
        </h2>
        <form onSubmit={save} className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="ticket-status" className="text-[11px] text-[#839087]">
              {t("status")}
            </Label>
            <Select
              id="ticket-status"
              value={values.status}
              onChange={(event) => setValues({ ...values, status: event.target.value as Status })}
              disabled={busy}
              className={selectClass}
            >
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {s(value)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-priority" className="text-[11px] text-[#839087]">
              {t("priority")}
            </Label>
            <Select
              id="ticket-priority"
              value={values.priority}
              onChange={(event) =>
                setValues({ ...values, priority: event.target.value as Priority })
              }
              disabled={busy}
              className={selectClass}
            >
              {priorities.map((value) => (
                <option key={value} value={value}>
                  {p(value)}
                </option>
              ))}
            </Select>
          </div>
          <div className="border-t border-[#edf0ed]" />
          <div className="space-y-2">
            <Label htmlFor="ticket-department" className="text-[11px] text-[#839087]">
              {t("department")}
            </Label>
            <Select
              id="ticket-department"
              value={values.departmentId}
              onChange={(event) => {
                setValues({ ...values, departmentId: event.target.value });
                setConfirmEmail(false);
              }}
              disabled={busy}
              className={selectClass}
            >
              <option value="">{t("unassigned")}</option>
              {departments
                .filter((item) => item.active || item.id === ticket.departmentId)
                .map((item) => (
                  <option key={item.id} value={item.id} disabled={!item.active}>
                    {item.name}
                    {!item.active ? ` (${t("inactive")})` : ""}
                  </option>
                ))}
            </Select>
            {!departments.some((item) => item.active) && (
              <p className="text-[10px] leading-5 text-[#9aa397]">{t("noDepartments")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-assignee" className="text-[11px] text-[#839087]">
              {t("assignee")}
            </Label>
            <Select
              id="ticket-assignee"
              value={values.assigneeId}
              onChange={(event) => setValues({ ...values, assigneeId: event.target.value })}
              disabled={busy}
              className={selectClass}
            >
              <option value="">{t("unassigned")}</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.email}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" size="sm" className="h-9 w-full" disabled={busy || !changed}>
            {busy ? <RefreshCw className="animate-spin" /> : <Check />}
            {t(busy ? "saving" : "saveChanges")}
          </Button>
          {error && (
            <p role="alert" className="text-xs leading-5 text-red-700">
              {error}
            </p>
          )}
          {saved && (
            <p role="status" className="text-xs text-primary">
              {t("saved")}
            </p>
          )}
        </form>
        <dl className="space-y-2 border-t border-[#e8ede9] bg-[#fafcfb] px-5 py-4 text-[10px]">
          <div className="flex justify-between gap-3">
            <dt className="text-[#8e998f]">{t("created")}</dt>
            <dd className="text-right text-[#6e8073]">{timeLabel(ticket.createdAt, locale)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#8e998f]">{t("updated")}</dt>
            <dd className="text-right text-[#6e8073]">{timeLabel(ticket.updatedAt, locale)}</dd>
          </div>
        </dl>
      </section>
      <section className="rounded-xl border border-[#e1e7e2] bg-white p-5">
        <h2 className="flex items-center gap-2 text-xs font-semibold text-[#4c5f51]">
          <Mail className="size-3.5" />
          {t("notifyDepartment")}
        </h2>
        <p className="mt-2 text-[11px] leading-6 text-[#869188]">{t("emailHelp")}</p>
        {department?.email && (
          <p className="mt-2 break-all text-[11px] font-medium text-[#637a6b]">
            {department.email}
          </p>
        )}
        {changed ? (
          <p className="mt-3 text-[10px] leading-5 text-[#9c8755]">{t("saveBeforeEmail")}</p>
        ) : !department?.email || !department.active ? (
          <p className="mt-3 text-[10px] leading-5 text-[#9aa397]">{t("emailUnavailable")}</p>
        ) : null}
        {confirmEmail ? (
          <div className="mt-4 space-y-3 rounded-lg border border-[#dfe8e1] bg-[#f7faf7] p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium leading-5">
                {t("confirmEmail", { email: department?.email ?? "" })}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmEmail(false)}
                aria-label={t("cancel")}
                className="rounded p-0.5 text-muted-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <p className="text-[10px] leading-5 text-[#7c8b80]">{t("emailPrivacy")}</p>
            <Button size="sm" className="w-full" disabled={busy || changed} onClick={forwardEmail}>
              {busy ? <RefreshCw className="animate-spin" /> : <Send />}
              {t(busy ? "sending" : "confirmSend")}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 h-9 w-full text-[11px]"
            disabled={busy || changed || !department?.email || !department.active}
            onClick={() => {
              setConfirmEmail(true);
              setEmailSent(false);
              setEmailError(null);
              setEmailRequestId(crypto.randomUUID());
            }}
          >
            <Mail />
            {t("emailAction")}
          </Button>
        )}
        {emailError && (
          <p role="alert" className="mt-3 text-xs leading-5 text-red-700">
            {emailError}
          </p>
        )}
        {emailSent && (
          <p role="status" className="mt-3 text-xs leading-5 text-primary">
            {t("emailSent")}
          </p>
        )}
      </section>
    </>
  );
}

function TicketHistory({
  events,
  staff,
  departments,
}: {
  events: TicketEvent[];
  staff: StaffMember[];
  departments: Department[];
}) {
  const t = useTranslations("tickets");
  const s = useTranslations("statuses");
  const p = useTranslations("priorities");
  const locale = useLocale();
  const history = [...events].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  function changeLabel(event: TicketEvent, value: string | null | undefined) {
    if (!value) return t("unassigned");
    if (event.action === "status_changed" && statuses.includes(value as Status)) return s(value);
    if (event.action === "priority_changed" && priorities.includes(value as Priority))
      return p(value);
    if (event.action === "department_changed")
      return (
        departments.find((department) => department.id === value)?.name ?? t("formerDepartment")
      );
    if (event.action === "assignee_changed")
      return staff.find((person) => person.id === value)?.email ?? t("staffMember");
    return value;
  }
  return (
    <div className="p-5 sm:p-6">
      {history.length ? (
        <ol className="ml-2 border-l border-[#e1e9e2]">
          {history.map((event) => (
            <li key={event.id} className="relative pb-7 pl-6 last:pb-0">
              <span className="absolute -left-[4.5px] top-1 size-2 rounded-full border-2 border-white bg-[#749b83] ring-4 ring-white" />
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <p className="text-xs font-medium text-[#4d6253]">
                  {t.has(`events.${event.action}`)
                    ? t(`events.${event.action}`)
                    : t("events.updated")}
                </p>
                <time dateTime={event.createdAt} className="text-[10px] text-[#94a095]">
                  {timeLabel(event.createdAt, locale)}
                </time>
              </div>
              {"to" in event.changes && (
                <p className="mt-2 break-words text-[11px] leading-5 text-[#829084]">
                  {changeLabel(event, event.changes.from)} <span aria-hidden>→</span>{" "}
                  {changeLabel(event, event.changes.to)}
                </p>
              )}
              <p className="mt-1.5 break-words text-[10px] text-[#9aa49b]">
                {event.actorId
                  ? (staff.find((person) => person.id === event.actorId)?.email ?? t("staffMember"))
                  : event.action === "follow_up_added" || event.action === "created"
                    ? t("anonymousAuthor")
                    : t("system")}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="py-8 text-center text-xs text-muted-foreground">{t("noHistory")}</p>
      )}
    </div>
  );
}
