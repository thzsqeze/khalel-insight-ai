import "server-only";
import { z } from "zod";
import { serviceClient } from "./supabase";
import { ApiError } from "./errors";

const reservationSchema = z.object({
  id: z.uuid(),
  recipient: z.email(),
  reference: z.string().regex(/^UV-[A-Z0-9]+$/),
  status: z.enum(["pending", "sent", "failed"]),
  shouldSend: z.boolean(),
});

export function emailConfiguration() {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const address = process.env.EMAIL_APP_ORIGIN || process.env.APP_ORIGIN;
  try {
    const url = new URL(address ?? "");
    if (
      !key ||
      !from ||
      !z.email().safeParse(from).success ||
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
      throw new Error();
    return { key, from, origin: url.origin };
  } catch {
    throw new ApiError("email_configuration", 503);
  }
}

function databaseError(error: { message: string } | null) {
  if (!error) return;
  if (error.message.includes("forbidden")) throw new ApiError("forbidden", 403);
  if (error.message.includes("not_found")) throw new ApiError("not_found", 404);
  if (
    error.message.includes("email_department") ||
    error.message.includes("department_email_required")
  )
    throw new ApiError("email_department", 400);
  if (error.message.includes("invalid_input")) throw new ApiError("invalid_input", 400);
  throw new ApiError("unavailable", 503);
}

/** A department notification contains no complaint text or visitor bearer code. */
export async function forwardTicket(ticketId: string, actorId: string, requestId: string) {
  const config = emailConfiguration();
  const client = serviceClient();
  const { data, error } = await client.rpc("reserve_ticket_email", {
    p_ticket_id: ticketId,
    p_actor: actorId,
    p_request_id: requestId,
  });
  databaseError(error);
  const parsed = reservationSchema.safeParse(data);
  if (!parsed.success) throw new ApiError("unavailable", 503);
  const reservation = parsed.data;
  if (!reservation.shouldSend) {
    if (reservation.status === "sent") return { ok: true };
    throw new ApiError(reservation.status === "pending" ? "email_pending" : "email_failed", 409);
  }
  let providerId: string | null = null;
  let failure: "email_failed" | "email_uncertain" | null = null;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(12000),
      headers: {
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `univoice-ticket/${reservation.id}`,
      },
      body: JSON.stringify({
        from: config.from,
        to: [reservation.recipient],
        subject: `UniVoice · ${reservation.reference}`,
        text: `Вам направлено обращение ${reservation.reference}.\nПерейдите в защищённый кабинет UniVoice для рассмотрения:\n${config.origin}/admin/tickets/${ticketId}\n\nӨтінішті қарастыру үшін UniVoice қорғалған кабинетіне кіріңіз.\n\nПисьмо не содержит текст обращения. Для доступа нужна учётная запись сотрудника. Ответьте автору в кабинете, а не на это письмо.`,
      }),
    });
    if (!response.ok) {
      // A server-side timeout or 5xx may have happened after acceptance.
      failure =
        response.status >= 500 || response.status === 408 ? "email_uncertain" : "email_failed";
    } else {
      const body: unknown = await response.json();
      const result = z.object({ id: z.string().min(1).max(200) }).safeParse(body);
      if (result.success) providerId = result.data.id;
      else failure = "email_uncertain";
    }
  } catch {
    failure = "email_uncertain";
  }
  // Leave ambiguous attempts pending: never automatically resend a possibly accepted email.
  if (failure === "email_uncertain") throw new ApiError(failure, 503);
  const finalized = await client.rpc("finalize_ticket_email", {
    p_id: reservation.id,
    p_actor: actorId,
    p_status: providerId ? "sent" : "failed",
    p_provider_id: providerId,
  });
  if (finalized.error) throw new ApiError("email_uncertain", 503);
  if (failure) throw new ApiError(failure, 502);
  return { ok: true };
}
