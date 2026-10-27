import type { Submission, Status, Priority } from "./types";

export interface Department {
  id: string;
  name: string;
  email: string | null;
  active: boolean;
}
export interface StaffMember {
  id: string;
  email: string;
  role: "owner" | "admin" | "moderator";
}
export interface Ticket extends Submission {
  status: Status;
  priority: Priority;
  departmentId: string | null;
  assigneeId: string | null;
  updatedAt: string;
}
export interface TicketMessage {
  id: string;
  kind: "reply" | "note" | "follow_up";
  body: string;
  authorId: string | null;
  createdAt: string;
}
export interface TicketEvent {
  id: string;
  action: string;
  actorId: string | null;
  createdAt: string;
  changes: Record<string, string | null>;
}
export interface TicketDetail {
  ticket: Ticket;
  messages: TicketMessage[];
  events: TicketEvent[];
}
export interface TicketQueue {
  tickets: Ticket[];
  departments: Department[];
  staff: StaffMember[];
}
export interface TicketPatch {
  status?: Status;
  priority?: Priority;
  departmentId?: string | null;
  assigneeId?: string | null;
}
