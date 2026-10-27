import { z } from "zod";
import { requireAdmin } from "@/lib/server/auth";
import { respond } from "@/lib/server/http";
import { serviceClient } from "@/lib/server/supabase";
import { ApiError } from "@/lib/server/errors";
import {
  ticketAnalytics,
  type AnalyticsTicket,
  type AnalyticsMessage,
  type AnalyticsEvent,
} from "@/lib/ticket-analytics";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return respond(async () => {
    await requireAdmin();
    const days = z
      .enum(["7", "30", "90"])
      .parse(new URL(request.url).searchParams.get("days") ?? "30");
    const client = serviceClient();
    const load = async (table: string, columns: string) => {
      const rows: Record<string, unknown>[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await client
          .from(table)
          .select(columns)
          .order("id")
          .range(offset, offset + 999);
        if (error) throw new ApiError("unavailable", 503);
        rows.push(...((data as unknown as Record<string, unknown>[]) ?? []));
        if (!data || data.length < 1000) break;
      }
      return rows;
    };
    const [tickets, submissions, messages, events] = await Promise.all([
      load("tickets", "id,status,priority,created_at,updated_at"),
      load("submissions", "id,reference,description"),
      load("ticket_messages", "id,ticket_id,kind,created_at"),
      load("ticket_events", "id,ticket_id,action,changes,created_at"),
    ]);
    const reports = new Map(submissions.map((row) => [row.id, row]));
    return ticketAnalytics(
      tickets.map((row): AnalyticsTicket => {
        const report = reports.get(row.id);
        return {
          id: String(row.id),
          reference: String(report?.reference ?? ""),
          subject: String(report?.description ?? ""),
          status: row.status as AnalyticsTicket["status"],
          priority: row.priority as AnalyticsTicket["priority"],
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at),
        };
      }),
      messages.map((row): AnalyticsMessage => ({
        ticketId: String(row.ticket_id),
        kind: row.kind as AnalyticsMessage["kind"],
        createdAt: String(row.created_at),
      })),
      events.map((row): AnalyticsEvent => ({
        ticketId: String(row.ticket_id),
        status:
          row.action === "status_changed"
            ? ((row.changes as Record<string, string> | null)?.to ?? null)
            : null,
        createdAt: String(row.created_at),
      })),
      Number(days),
    );
  });
}
