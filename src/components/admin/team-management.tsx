"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  MailPlus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { ApiError, requestJson, useRemote } from "@/lib/client-api";
import { teamRoles, type TeamMember, type TeamPage, type TeamRole } from "@/lib/team";
import type { Department } from "@/lib/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataError, DashboardSkeleton } from "./shared";

function RoleRow({
  member,
  currentUserId,
  onSaved,
}: {
  member: TeamMember;
  currentUserId: string;
  onSaved: () => void;
}) {
  const t = useTranslations("team");
  const [role, setRole] = useState<TeamRole>(member.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoverySent, setRecoverySent] = useState(false);
  const self = member.id === currentUserId;
  async function save() {
    setBusy(true);
    setError(null);
    try {
      await requestJson(`/api/admin/team/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      onSaved();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.code : "unavailable");
    } finally {
      setBusy(false);
    }
  }
  async function sendRecovery() {
    setBusy(true);
    setError(null);
    setRecoverySent(false);
    try {
      await requestJson(`/api/admin/team/${member.id}/recovery`, { method: "POST", body: "{}" });
      setRecoverySent(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.code : "unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <tr>
      <td>
        <span className="block break-all text-sm font-medium">{member.email || t("noEmail")}</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {self ? t("you") : member.confirmed ? t("confirmed") : t("awaitingConfirmation")}
        </span>
      </td>
      <td>
        <Select
          aria-label={`${t("role")}: ${member.email}`}
          value={role}
          disabled={self || busy || !member.confirmed}
          onChange={(event) => setRole(event.target.value as TeamRole)}
        >
          {teamRoles.map((value) => (
            <option key={value} value={value}>
              {t(`roles.${value}`)}
            </option>
          ))}
        </Select>
        <p className="mt-2 max-w-xs text-xs leading-5 text-muted-foreground">
          {t(`roleDescriptions.${role}`)}
        </p>
      </td>
      <td className="text-right">
        <Button
          variant="outline"
          size="sm"
          onClick={save}
          disabled={self || busy || !member.confirmed || role === member.role}
        >
          {busy && <LoaderCircle className="animate-spin" />}
          {t("save")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          disabled={busy || !member.email}
          onClick={sendRecovery}
        >
          {t("sendRecovery")}
        </Button>
        {recoverySent && (
          <p role="status" className="mt-2 max-w-xs text-xs text-primary">
            {t("recoverySent")}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-2 max-w-xs text-xs text-red-700">
            {t.has(`errors.${error}`) ? t(`errors.${error}`) : t("errors.unavailable")}
          </p>
        )}
      </td>
    </tr>
  );
}

function DepartmentForm({ department, onSaved }: { department?: Department; onSaved: () => void }) {
  const t = useTranslations("team");
  const [name, setName] = useState(department?.name ?? "");
  const [email, setEmail] = useState(department?.email ?? "");
  const [active, setActive] = useState(department?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestJson(
        department ? `/api/admin/departments/${department.id}` : "/api/admin/departments",
        {
          method: department ? "PATCH" : "POST",
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim() || null,
            ...(department ? { active } : {}),
          }),
        },
      );
      if (!department) {
        setName("");
        setEmail("");
      }
      onSaved();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.code : "unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="space-y-3 rounded-xl border border-border bg-white p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-xs font-medium text-muted-foreground">
          {t("departmentName")}
          <Input
            className="mt-2"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
            maxLength={120}
            disabled={busy}
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          {t("departmentEmail")}
          <Input
            type="email"
            className="mt-2"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
            disabled={busy}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {department ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              disabled={busy}
              className="size-4 accent-primary"
            />
            {t("departmentActive")}
          </label>
        ) : (
          <span className="text-xs text-muted-foreground">{t("departmentOptionalEmail")}</span>
        )}
        <Button
          type="submit"
          variant={department ? "outline" : "default"}
          size="sm"
          disabled={busy}
        >
          {busy && <LoaderCircle className="animate-spin" />}
          {t(department ? "save" : "addDepartment")}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {t.has(`errors.${error}`) ? t(`errors.${error}`) : t("errors.unavailable")}
        </p>
      )}
    </form>
  );
}

export function TeamManagement({ currentUserId }: { currentUserId: string }) {
  const t = useTranslations("team");
  const [page, setPage] = useState(1);
  const team = useRemote<TeamPage>(`/api/admin/team?page=${page}`);
  const departments = useRemote<{ departments: Department[] }>("/api/admin/departments");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(false);
    setError(null);
    try {
      await requestJson("/api/admin/team/invite", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setEmail("");
      setNotice(true);
      team.reload();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.code : "unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-w-0 space-y-8">
      <header>
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">
          <ShieldCheck className="size-4" />
          {t("ownerAccess")}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{t("subtitle")}</p>
      </header>
      <section className="rounded-xl border border-border bg-white p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <MailPlus className="size-5 text-primary" />
          {t("inviteTitle")}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t("inviteBody")}</p>
        <form onSubmit={invite} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input
            aria-label={t("employeeEmail")}
            type="email"
            autoComplete="email"
            placeholder={t("employeeEmail")}
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
            className="sm:max-w-md"
          />
          <Button disabled={busy}>
            {busy && <LoaderCircle className="animate-spin" />}
            {t("sendInvite")}
          </Button>
        </form>
        {notice && (
          <p role="status" className="mt-3 text-sm text-primary">
            {t("inviteSent")}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {t.has(`errors.${error}`) ? t(`errors.${error}`) : t("errors.unavailable")}
          </p>
        )}
      </section>
      <section className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Users className="size-5 text-primary" />
            {t("members")}
          </h2>
          <Button variant="ghost" size="sm" onClick={team.reload} disabled={team.loading}>
            {t("refresh")}
          </Button>
        </div>
        {team.error ? (
          <DataError error={team.error} retry={team.reload} />
        ) : team.loading ? (
          <div className="p-6">
            <DashboardSkeleton />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t("employee")}</th>
                    <th>{t("role")}</th>
                    <th>
                      <span className="sr-only">{t("save")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {team.data?.members.map((member) => (
                    <RoleRow
                      key={`${member.id}:${member.role}:${member.confirmed}`}
                      member={member}
                      currentUserId={currentUserId}
                      onSaved={team.reload}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {!team.data?.members.length && (
              <p className="p-6 text-sm text-muted-foreground">{t("noMembers")}</p>
            )}
            <div className="flex items-center justify-between border-t border-border px-6 py-4">
              <span className="text-xs text-muted-foreground">{t("page", { page })}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={t("previous")}
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={t("next")}
                  disabled={!team.data?.hasNext}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
      <section className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Building2 className="size-5 text-primary" />
            {t("departments")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {t("departmentsBody")}
          </p>
        </div>
        {departments.error ? (
          <DataError error={departments.error} retry={departments.reload} />
        ) : (
          departments.data?.departments.map((department) => (
            <DepartmentForm
              key={`${department.id}:${department.name}:${department.email}:${department.active}`}
              department={department}
              onSaved={departments.reload}
            />
          ))
        )}
        <DepartmentForm onSaved={departments.reload} />
      </section>
    </div>
  );
}
