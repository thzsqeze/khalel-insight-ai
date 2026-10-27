import { expect, it } from "vitest";
import { ticketAnalytics, type AnalyticsTicket } from "@/lib/ticket-analytics";
const ticket: AnalyticsTicket = {
  id: "a",
  reference: "UV-A",
  subject: "Report",
  status: "new",
  priority: "medium",
  createdAt: "2026-10-26T20:00:00Z",
  updatedAt: "2026-10-26T20:00:00Z",
};
const now = new Date("2026-10-27T10:00:00Z");
it("keeps empty charts truthful", () => {
  const result = ticketAnalytics([], [], [], 7, now);
  expect(result.total).toBe(0);
  expect(result.averageReplyMinutes).toBeNull();
  expect(result.trend).toHaveLength(7);
  expect(result.trend.every((point) => point.replyMinutes === null && point.created === 0)).toBe(
    true,
  );
});
it("counts replies and first reply latency without treating private notes as replies", () => {
  const result = ticketAnalytics(
    [ticket],
    [
      { ticketId: "a", kind: "note", createdAt: "2026-10-26T20:01:00Z" },
      { ticketId: "a", kind: "reply", createdAt: "2026-10-26T21:00:00Z" },
      { ticketId: "a", kind: "reply", createdAt: "2026-10-26T22:00:00Z" },
      { ticketId: "a", kind: "follow_up", createdAt: "2026-10-26T23:00:00Z" },
    ],
    [],
    7,
    now,
  );
  expect(result.averageReplyMinutes).toBe(60);
  expect(result.staffReplies).toBe(2);
  expect(result.visitorReplies).toBe(1);
  expect(result.unanswered).toBe(1);
  expect(result.trend.find((point) => point.date === "2026-10-27")?.created).toBe(1);
});
it("deduplicates same-day resolutions and leaves private-note-only ticket unanswered", () => {
  const result = ticketAnalytics(
    [ticket],
    [{ ticketId: "a", kind: "note", createdAt: now.toISOString() }],
    [
      { ticketId: "a", status: "resolved", createdAt: now.toISOString() },
      { ticketId: "a", status: "resolved", createdAt: now.toISOString() },
    ],
    7,
    now,
  );
  expect(result.resolved).toBe(1);
  expect(result.unanswered).toBe(1);
  expect(result.averageReplyMinutes).toBeNull();
});

it("includes first replies during the period even when the ticket was created earlier", () => {
  const result = ticketAnalytics(
    [{ ...ticket, createdAt: "2026-10-17T10:00:00Z" }],
    [{ ticketId: "a", kind: "reply", createdAt: "2026-10-27T09:00:00Z" }],
    [],
    7,
    now,
  );
  expect(result.total).toBe(0);
  expect(result.created).toBe(0);
  expect(result.staffReplies).toBe(1);
  expect(result.averageReplyMinutes).toBe(14340);
  expect(result.trend.find((point) => point.date === "2026-10-27")?.replyMinutes).toBe(14340);
});

it("counts reopened conversations awaiting a staff reply and ignores private notes", () => {
  const result = ticketAnalytics(
    [{ ...ticket, status: "under_review", createdAt: "2026-10-17T10:00:00Z" }],
    [
      { ticketId: "a", kind: "reply", createdAt: "2026-10-18T10:00:00Z" },
      { ticketId: "a", kind: "follow_up", createdAt: "2026-10-27T08:00:00Z" },
      { ticketId: "a", kind: "note", createdAt: "2026-10-27T09:00:00Z" },
    ],
    [],
    7,
    now,
  );
  expect(result.unanswered).toBe(1);
  expect(result.visitorReplies).toBe(1);
  expect(result.averageReplyMinutes).toBeNull();
});

it("clears the waiting count after a new public reply, excluding resolved tickets", () => {
  const result = ticketAnalytics(
    [ticket, { ...ticket, id: "resolved", status: "resolved" }],
    [
      { ticketId: "a", kind: "follow_up", createdAt: "2026-10-27T08:00:00Z" },
      { ticketId: "a", kind: "reply", createdAt: "2026-10-27T09:00:00Z" },
    ],
    [],
    7,
    now,
  );
  expect(result.unanswered).toBe(0);
});

it("shows the entire current workload and recently updated tickets across date filters", () => {
  const result = ticketAnalytics(
    [
      {
        ...ticket,
        id: "old",
        priority: "critical",
        createdAt: "2026-10-17T10:00:00Z",
        updatedAt: "2026-10-27T09:00:00Z",
      },
      ticket,
      {
        ...ticket,
        id: "resolved",
        status: "resolved",
        priority: "high",
        updatedAt: "2026-10-27T08:00:00Z",
      },
    ],
    [],
    [],
    7,
    now,
  );
  expect(result.total).toBe(2);
  expect(result.active).toBe(2);
  expect(result.unanswered).toBe(2);
  expect(result.priorities).toEqual([
    { priority: "low", count: 0 },
    { priority: "medium", count: 1 },
    { priority: "high", count: 0 },
    { priority: "critical", count: 1 },
  ]);
  expect(result.recent.map((item) => item.id)).toEqual(["old", "resolved", "a"]);
});
