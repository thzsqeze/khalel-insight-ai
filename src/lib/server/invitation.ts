import "server-only";
import { z } from "zod";
import { ApiError } from "./errors";
import { sessionClient } from "./supabase";

export const setupPasswordSchema = z
  .object({
    accessToken: z.string().min(20).max(8192),
    refreshToken: z.string().min(10).max(2048),
    password: z.string().min(12).max(128),
  })
  .strict();

export async function setupInvitedPassword(input: unknown) {
  const { accessToken, refreshToken, password } = setupPasswordSchema.parse(input);
  const client = await sessionClient();
  const { error: sessionError } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (sessionError) throw new ApiError("invitation_expired", 401);
  try {
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error || !user?.email_confirmed_at) throw new ApiError("invitation_expired", 401);
    const { error: updateError } = await client.auth.updateUser({ password });
    if (updateError)
      throw new ApiError(
        updateError.code === "weak_password" ? "weak_password" : "unavailable",
        400,
      );
  } finally {
    // Completion does not leave an invitation session in the browser. The user
    // signs in normally after the owner has granted access.
    await client.auth.signOut({ scope: "local" });
  }
}
