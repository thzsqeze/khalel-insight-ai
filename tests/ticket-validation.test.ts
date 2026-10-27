import { describe, expect, it } from "vitest";
import {
  ticketPatchSchema,
  ticketMessageSchema,
  followUpSchema,
  departmentCreateSchema,
  departmentPatchSchema,
} from "@/lib/server/ticket-validation";

describe("ticket request boundaries", () => {
  it("accepts only explicit changes and valid routing IDs", () => {
    expect(ticketPatchSchema.safeParse({}).success).toBe(false);
    expect(ticketPatchSchema.safeParse({ assigneeId: "someone" }).success).toBe(false);
    expect(ticketPatchSchema.safeParse({ status: "resolved", actor: "owner" }).success).toBe(false);
    expect(ticketPatchSchema.parse({ departmentId: null, status: "resolved" })).toEqual({
      departmentId: null,
      status: "resolved",
    });
  });
  it("bounds plain text replies and does not permit staff follow-up impersonation", () => {
    expect(
      ticketMessageSchema.parse({ kind: "reply", body: "  Hello <script>test</script>  " }).body,
    ).toBe("Hello <script>test</script>");
    for (const body of [" ", "x".repeat(5001)])
      expect(ticketMessageSchema.safeParse({ kind: "note", body }).success).toBe(false);
    expect(ticketMessageSchema.safeParse({ kind: "follow_up", body: "Hello" }).success).toBe(false);
    expect(
      ticketMessageSchema.safeParse({ kind: "reply", body: "Hello", authorId: "fake" }).success,
    ).toBe(false);
  });
  it("requires a complete bearer token and allows no visitor-supplied identity or note kind", () => {
    const code = "x".repeat(32);
    expect(followUpSchema.parse({ code, body: "  A follow-up  " })).toEqual({
      code,
      body: "A follow-up",
    });
    for (const input of [
      { code: "short", body: "A follow-up" },
      { code, body: "Hello", kind: "note" },
      { code, body: "Hello", ticketId: "fake" },
    ]) {
      expect(followUpSchema.safeParse(input).success).toBe(false);
    }
  });
  it("validates owner department settings", () => {
    expect(departmentCreateSchema.parse({ name: "  IT  ", email: "it@example.edu" })).toEqual({
      name: "IT",
      email: "it@example.edu",
    });
    expect(departmentCreateSchema.safeParse({ name: "IT", email: "broken" }).success).toBe(false);
    expect(departmentPatchSchema.safeParse({}).success).toBe(false);
    expect(departmentPatchSchema.parse({ active: false, email: null })).toEqual({
      active: false,
      email: null,
    });
  });
});
