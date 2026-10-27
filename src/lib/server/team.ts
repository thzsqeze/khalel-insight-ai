import "server-only";
import { z } from "zod";
import type { StaffMember } from "@/lib/tickets";
import { teamRoles, type TeamPage, type TeamRole } from "@/lib/team";
import { requireAdmin, requireOwner } from "./auth";
import { ApiError } from "./errors";
import { serviceClient, sessionClient } from "./supabase";

const roleChange = z.object({ role: z.enum(teamRoles) }).strict();
export const inviteSchema = z.object({ email: z.email().trim().max(254) }).strict();
const pageSchema = z.coerce.number().int().min(1).max(10000);
const uuid = z.uuid();
const PAGE_SIZE = 50;

export async function getTeamPage(pageInput: unknown = 1): Promise<TeamPage> {
  await requireOwner();
  const page = pageSchema.parse(pageInput);
  const client = serviceClient();
  const { data, error } = await client.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
  if (error) throw new ApiError("unavailable", 503);
  const users = data.users;
  if (!users.length) return { members: [], page, hasNext: false };
  const { data: profiles, error: profilesError } = await client
    .from("profiles")
    .select("id,role,is_owner")
    .in(
      "id",
      users.map((user) => user.id),
    );
  if (profilesError) throw new ApiError("unavailable", 503);
  const roles = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      (profile.role === "admin" && profile.is_owner === true ? "owner" : profile.role) as TeamRole,
    ]),
  );
  return {
    members: users.map((user) => ({
      id: user.id,
      email: user.email ?? "",
      role: roles.get(user.id) ?? "viewer",
      confirmed: Boolean(user.email_confirmed_at),
      invited: Boolean(user.invited_at),
    })),
    page,
    hasNext: data.total ? page * PAGE_SIZE < data.total : users.length === PAGE_SIZE,
  };
}

export async function getStaffDirectory(): Promise<StaffMember[]> {
  await requireAdmin();
  const client = serviceClient();
  const { data, error } = await client
    .from("profiles")
    .select("id,role,is_owner")
    .in("role", ["admin", "moderator"])
    .order("id")
    .limit(501);
  if (error || !data || data.length > 500) throw new ApiError("unavailable", 503);
  const result: StaffMember[] = [];
  // Bounded batches avoid unbounded auth requests when the team grows.
  for (let offset = 0; offset < data.length; offset += 10) {
    const batch = await Promise.all(
      data.slice(offset, offset + 10).map(async (profile) => {
        const { data: identity, error: identityError } = await client.auth.admin.getUserById(
          profile.id,
        );
        if (identityError || !identity.user) throw new ApiError("unavailable", 503);
        return {
          id: profile.id as string,
          email: identity.user.email ?? "",
          role: (profile.role === "admin" && profile.is_owner === true
            ? "owner"
            : profile.role) as StaffMember["role"],
        };
      }),
    );
    result.push(...batch);
  }
  return result.sort((a, b) => a.email.localeCompare(b.email));
}

export async function changeTeamRole(target: string, input: unknown) {
  const owner = await requireOwner();
  const id = uuid.parse(target);
  const { role } = roleChange.parse(input);
  if (owner.id === id) throw new ApiError("self_role_change", 409);
  // Session client preserves auth.uid(); the RPC cannot accept a forged actor.
  const client = await sessionClient();
  const { error } = await client.rpc("change_role", { p_target: id, p_role: role });
  if (error) {
    const code = error.message;
    if (["self_role_change", "last_owner", "user_unconfirmed"].includes(code))
      throw new ApiError(code, 409);
    if (code === "forbidden" || error.code === "42501") throw new ApiError("forbidden", 403);
    if (code === "not_found") throw new ApiError(code, 404);
    if (code === "invalid_input") throw new ApiError(code);
    throw new ApiError("unavailable", 503);
  }
}

export function invitationRedirect() {
  let origin: URL;
  try {
    origin = new URL(process.env.APP_ORIGIN ?? "");
  } catch {
    throw new ApiError("unavailable", 503);
  }
  if (
    origin.origin !== process.env.APP_ORIGIN ||
    (origin.protocol !== "https:" &&
      !(
        process.env.NODE_ENV !== "production" &&
        origin.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)
      ))
  ) {
    throw new ApiError("unavailable", 503);
  }
  return new URL("/auth/setup-password", origin).href;
}

export async function inviteTeamMember(input: unknown) {
  await requireOwner();
  const { email } = inviteSchema.parse(input);
  const redirectTo = invitationRedirect();
  const { error } = await serviceClient().auth.admin.inviteUserByEmail(email, { redirectTo });
  // The profile trigger creates only a viewer. Invite success or failure never
  // changes roles, including an invitation sent to an existing identity.
  if (error)
    throw new ApiError(
      error.code === "email_exists" || error.code === "user_already_exists"
        ? "email_exists"
        : "invite_failed",
      error.status === 429 ? 429 : 409,
    );
}

export async function recoverTeamMember(target: string) {
  await requireOwner();
  const id = uuid.parse(target);
  const redirectTo = invitationRedirect();
  const client = serviceClient();
  const { data, error } = await client.auth.admin.getUserById(id);
  if (error || !data.user) throw new ApiError("not_found", 404);
  if (!data.user.email) throw new ApiError("invalid_input");
  // This non-SSR client uses Supabase's implicit flow. A reset initiated by an
  // owner must not require a PKCE verifier stored in the owner's browser.
  const { error: recoveryError } = await client.auth.resetPasswordForEmail(data.user.email, {
    redirectTo,
  });
  if (recoveryError)
    throw new ApiError("recovery_failed", recoveryError.status === 429 ? 429 : 409);
}
