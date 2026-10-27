import "server-only";
import type { Department, TicketDetail, TicketPatch, TicketQueue } from "@/lib/tickets";
import type { DepartmentCreate, DepartmentPatch, TicketMessageInput } from "./ticket-validation";
import { serviceClient } from "./supabase";
import { hashTrackingCode } from "./security";
import { ApiError } from "./errors";

function check(error: { message: string; code?: string } | null) {
  if (!error) return;
  if (error.message === "forbidden" || error.code === "42501") throw new ApiError("forbidden", 403);
  if (error.message === "not_found") throw new ApiError("not_found", 404);
  if (error.message === "invalid_input" || ["23514", "22P02", "23502"].includes(error.code ?? ""))
    throw new ApiError("invalid_input");
  // Never log provider error text: it can contain message text or bearer secrets.
  throw new ApiError("unavailable", 503);
}

export class TicketRepository {
  private client = serviceClient();
  private async rpc(name: string, payload: Record<string, unknown>) {
    const { data, error } = await this.client.rpc(name, payload);
    check(error);
    return data;
  }
  async queue(actor: string): Promise<Omit<TicketQueue, "staff">> {
    return this.rpc("ticket_read", { p_actor: actor, p_id: null });
  }
  async detail(id: string, actor: string): Promise<TicketDetail | null> {
    return this.rpc("ticket_read", { p_actor: actor, p_id: id });
  }
  async patch(id: string, patch: TicketPatch, actor: string): Promise<void> {
    await this.rpc("ticket_action", {
      p_action: "patch",
      p_id: id,
      p_payload: patch,
      p_actor: actor,
    });
  }
  async message(id: string, input: TicketMessageInput, actor: string): Promise<void> {
    await this.rpc("ticket_action", {
      p_action: "message",
      p_id: id,
      p_payload: input,
      p_actor: actor,
    });
  }
  async followUp(code: string, body: string): Promise<void> {
    await this.rpc("ticket_follow_up", { p_hash: hashTrackingCode(code), p_body: body });
  }
  async departments(actor: string): Promise<Department[]> {
    return this.rpc("department_list", { p_actor: actor });
  }
  async createDepartment(input: DepartmentCreate, actor: string): Promise<void> {
    await this.rpc("department_action", {
      p_action: "create",
      p_id: null,
      p_payload: input,
      p_actor: actor,
    });
  }
  async patchDepartment(id: string, input: DepartmentPatch, actor: string): Promise<void> {
    await this.rpc("department_action", {
      p_action: "patch",
      p_id: id,
      p_payload: input,
      p_actor: actor,
    });
  }
}
export function getTicketRepository() {
  return new TicketRepository();
}
