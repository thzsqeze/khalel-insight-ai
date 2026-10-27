import { z } from "zod";
import { priorities, statuses } from "@/lib/types";

const body = z.string().trim().min(1).max(5000);
export const ticketIdSchema = z.uuid();
export const ticketPatchSchema = z
  .object({
    status: z.enum(statuses).optional(),
    priority: z.enum(priorities).optional(),
    departmentId: z.uuid().nullable().optional(),
    assigneeId: z.uuid().nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);
export const ticketMessageSchema = z
  .object({
    kind: z.enum(["reply", "note"]),
    body,
  })
  .strict();
export const followUpSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{32}$/),
    body,
  })
  .strict();
export const departmentCreateSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.email().max(254).nullable(),
  })
  .strict();
export const departmentPatchSchema = departmentCreateSchema
  .partial()
  .extend({
    active: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);
export type TicketMessageInput = z.infer<typeof ticketMessageSchema>;
export type DepartmentCreate = z.infer<typeof departmentCreateSchema>;
export type DepartmentPatch = z.infer<typeof departmentPatchSchema>;
