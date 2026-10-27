import type { Priority, Status } from "./types";
export interface AnalyticsTicket {
  id: string;
  reference: string;
  subject: string;
  status: Status;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
}
export interface AnalyticsMessage {
  ticketId: string;
  kind: "reply" | "note" | "follow_up";
  createdAt: string;
}
export interface AnalyticsEvent {
  ticketId: string;
  status: string | null;
  createdAt: string;
}
export interface TicketAnalytics {
  days: number;
  total: number;
  visitorReplies: number;
  staffReplies: number;
  unanswered: number;
  active: number;
  averageReplyMinutes: number | null;
  created: number;
  resolved: number;
  priorities: { priority: Priority; count: number }[];
  trend: { date: string; created: number; resolved: number; replyMinutes: number | null }[];
  recent: AnalyticsTicket[];
}
const day = (value: string | Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Atyrau",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
export function ticketAnalytics(
  tickets: AnalyticsTicket[],
  messages: AnalyticsMessage[],
  events: AnalyticsEvent[],
  days: number,
  now = new Date(),
): TicketAnalytics {
  const trend: TicketAnalytics["trend"] = Array.from({ length: days }, (_, index) => ({
    date: day(new Date(now.getTime() - (days - index - 1) * 86400000)),
    created: 0,
    resolved: 0,
    replyMinutes: null,
  }));
  const byDay = new Map(trend.map((point) => [point.date, point]));
  const selected = tickets.filter((ticket) => byDay.has(day(ticket.createdAt)));
  const firstReplies = new Map<string, number>();
  const latestReplies = new Map<string, number>();
  const latestVisitorMessages = new Map(
    tickets.map((ticket) => [ticket.id, new Date(ticket.createdAt).getTime()]),
  );
  const replyTimes = new Map<string, number[]>();
  const inPeriod = (value: string | Date) => byDay.has(day(value));
  for (const message of messages) {
    if (message.kind === "note") continue;
    const timestamp = new Date(message.createdAt).getTime();
    if (message.kind === "follow_up") {
      latestVisitorMessages.set(
        message.ticketId,
        Math.max(latestVisitorMessages.get(message.ticketId) ?? -Infinity, timestamp),
      );
    } else {
      firstReplies.set(
        message.ticketId,
        Math.min(firstReplies.get(message.ticketId) ?? Infinity, timestamp),
      );
      latestReplies.set(
        message.ticketId,
        Math.max(latestReplies.get(message.ticketId) ?? -Infinity, timestamp),
      );
    }
  }
  for (const ticket of tickets) {
    const createdDay = byDay.get(day(ticket.createdAt));
    if (createdDay) createdDay.created += 1;
    const first = firstReplies.get(ticket.id);
    if (first !== undefined && inPeriod(new Date(first))) {
      const minutes = Math.max(0, (first - new Date(ticket.createdAt).getTime()) / 60000);
      const replyDay = day(new Date(first));
      const values = replyTimes.get(replyDay) ?? [];
      values.push(minutes);
      replyTimes.set(replyDay, values);
    }
  }
  // A ticket reopened and resolved twice on the same day counts once for that day.
  const resolutionDays = new Set<string>();
  for (const event of events) {
    if (event.status !== "resolved" || !inPeriod(event.createdAt)) continue;
    const key = `${event.ticketId}:${day(event.createdAt)}`;
    if (resolutionDays.has(key)) continue;
    resolutionDays.add(key);
    byDay.get(day(event.createdAt))!.resolved += 1;
  }
  const times = [...replyTimes.values()].flat();
  for (const [date, values] of replyTimes)
    byDay.get(date)!.replyMinutes = values.reduce((a, b) => a + b, 0) / values.length;
  const active = tickets.filter((ticket) => ticket.status !== "resolved");
  return {
    days,
    total: selected.length,
    visitorReplies: messages.filter(
      (message) => message.kind === "follow_up" && inPeriod(message.createdAt),
    ).length,
    staffReplies: messages.filter(
      (message) => message.kind === "reply" && inPeriod(message.createdAt),
    ).length,
    unanswered: active.filter(
      (ticket) =>
        latestVisitorMessages.get(ticket.id)! > (latestReplies.get(ticket.id) ?? -Infinity),
    ).length,
    active: active.length,
    averageReplyMinutes: times.length ? times.reduce((a, b) => a + b, 0) / times.length : null,
    created: selected.length,
    resolved: new Set([...resolutionDays].map((key) => key.split(":")[0])).size,
    priorities: (["low", "medium", "high", "critical"] as const).map((priority) => ({
      priority,
      count: active.filter((ticket) => ticket.priority === priority).length,
    })),
    trend,
    recent: [...tickets]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6),
  };
}
