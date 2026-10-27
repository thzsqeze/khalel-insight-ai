import "server-only";
import type { PublicTicketStatus } from "@/lib/types";
import { ApiError } from "./errors";
import { serviceClient } from "./supabase";

export function isPublicTrackingReference(value: string) {
  return /^UV-[0-9a-f]{10}$/i.test(value);
}

export async function lookupPublicTicketStatus(value: string): Promise<PublicTicketStatus | null> {
  if (!isPublicTrackingReference(value)) return null;
  const reference = value.toUpperCase();
  const client = serviceClient();
  const { data: submission, error: submissionError } = await client
    .from("submissions")
    .select("id,reference")
    .eq("reference", reference)
    .maybeSingle();
  if (submissionError) throw new ApiError("unavailable", 503);
  if (!submission) return null;

  const { data: ticket, error: ticketError } = await client
    .from("tickets")
    .select("status")
    .eq("id", submission.id)
    .maybeSingle();
  if (ticketError) throw new ApiError("unavailable", 503);
  if (!ticket) return null;

  // A public reference grants status access only, even if a query returns extra fields.
  return { access: "status", reference, status: ticket.status };
}
