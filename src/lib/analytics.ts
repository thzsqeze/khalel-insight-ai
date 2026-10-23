import { categories, type AdminSnapshot, type Category, type Status } from "@/lib/types";
export interface Filters { days: number; category: Category | "all"; status: Status | "all"; query: string; }
const dayKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Atyrau", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
export function filterSnapshot(snapshot: AdminSnapshot, filters: Filters, now = new Date()): AdminSnapshot {
  const cutoff = dayKey(new Date(now.getTime() - (filters.days - 1) * 86400000));
  const query = filters.query.trim().toLocaleLowerCase();
  const issuesById = new Map(snapshot.issues.map(issue => [issue.id, issue]));
  const submissions = snapshot.submissions.filter(report => {
    const issue = report.issueId ? issuesById.get(report.issueId) : undefined;
    const reportStatus = issue?.status ?? "new";
    return dayKey(new Date(report.createdAt)) >= cutoff && dayKey(new Date(report.createdAt)) <= dayKey(now)
      && (filters.category === "all" || report.category === filters.category)
      && (filters.status === "all" || reportStatus === filters.status)
      && (!query || [report.description, report.reference, issue?.title, issue?.titleKk, issue?.reference].some(text => text?.toLocaleLowerCase().includes(query)));
  });
  const counts = new Map<string, number>();
  submissions.forEach(report => { if (report.issueId) counts.set(report.issueId, (counts.get(report.issueId) ?? 0) + 1); });
  const issues = snapshot.issues.filter(issue => counts.has(issue.id)).map(issue => ({ ...issue, count: counts.get(issue.id)! }));
  return { ...snapshot, submissions, issues, events: snapshot.events.filter(event => counts.has(event.issueId)) };
}
export function computeAnalytics(snapshot: AdminSnapshot, days = 30, now = new Date()) {
  const filtered = filterSnapshot(snapshot, { days, category: "all", status: "all", query: "" }, now);
  const resolved = filtered.issues.filter(issue => issue.status === "resolved").length;
  const total = filtered.submissions.length;
  const trend = Array.from({ length: days }, (_, index) => ({ date: dayKey(new Date(now.getTime() - (days - 1 - index) * 86400000)), count: 0, resolved: 0 }));
  filtered.submissions.forEach(report => { const point = trend.find(item => item.date === dayKey(new Date(report.createdAt))); if (point) point.count += 1; });
  filtered.events.filter(event => event.status === "resolved").forEach(event => { const point = trend.find(item => item.date === dayKey(new Date(event.createdAt))); if (point) point.resolved += 1; });
  return { total, recurring: filtered.issues.filter(issue => issue.count >= 2).length, active: filtered.issues.length - resolved, resolved, resolutionRate: filtered.issues.length ? Math.round(resolved / filtered.issues.length * 100) : 0, categories: categories.map(category => ({ category, count: filtered.submissions.filter(report => report.category === category).length })).filter(item => item.count > 0), roles: { student: filtered.submissions.filter(report => report.role === "student").length, teacher: filtered.submissions.filter(report => report.role === "teacher").length }, trend, needsReview: filtered.submissions.filter(report => !report.analysis?.reviewed).length, filtered };
}
