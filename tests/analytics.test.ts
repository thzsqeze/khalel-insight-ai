import { describe, expect, it } from "vitest";
import { computeAnalytics, filterSnapshot } from "@/lib/analytics";
import type { AdminSnapshot, Issue, Submission } from "@/lib/types";
const now = new Date("2026-10-23T12:00:00Z");
const reports: Submission[] = [
  { id: "a", reference: "K-1", role: "student", category: "infrastructure", description: "Example", faculty: null, locale: "ru", aiConsent: false, createdAt: "2026-10-22T10:00:00Z", issueId: "i1", analysis: null, analysisStatus: "skipped" },
  { id: "b", reference: "K-2", role: "teacher", category: "infrastructure", description: "Example 2", faculty: null, locale: "kk", aiConsent: false, createdAt: "2026-10-22T10:00:00Z", issueId: "i1", analysis: null, analysisStatus: "skipped" },
  { id: "c", reference: "K-3", role: "student", category: "education", description: "Example 3", faculty: null, locale: "ru", aiConsent: false, createdAt: "2026-08-01T10:00:00Z", issueId: "i2", analysis: null, analysisStatus: "skipped" },
];
const issues: Issue[] = [
  { id: "i1", reference: "KI-1", title: "Heating", category: "infrastructure", status: "in_progress", priority: "medium", owner: null, publicSummary: null, published: false, resolutionNote: null, createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-10-22T10:00:00Z", count: 2 },
  { id: "i2", reference: "KI-2", title: "Books", category: "education", status: "resolved", priority: "low", owner: null, publicSummary: null, published: false, resolutionNote: null, createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z", count: 1 },
];
const snapshot: AdminSnapshot = { submissions: reports, issues, events: [] };
describe("analytics use stored records", () => {
  it("counts each real report and recurring cluster without synthetic totals", () => { const stats = computeAnalytics(snapshot, 30, now); expect(stats.total).toBe(2); expect(stats.recurring).toBe(1); expect(stats.active).toBe(1); expect(stats.resolved).toBe(0); expect(stats.roles).toEqual({ student: 1, teacher: 1 }); expect(stats.categories.find(c => c.category === "infrastructure")?.count).toBe(2); expect(stats.trend.reduce((sum, point) => sum + point.count, 0)).toBe(2); });
  it("keeps an older issue if it has a report within the selected period", () => { expect(filterSnapshot(snapshot, { days: 7, category: "all", status: "all", query: "" }, now).issues.map(i => i.id)).toEqual(["i1"]); });
  it("filters status and category consistently across reports and issues", () => { const result = filterSnapshot(snapshot, { days: 90, category: "education", status: "resolved", query: "books" }, now); expect(result.issues).toHaveLength(1); expect(result.submissions).toHaveLength(1); expect(result.submissions[0].id).toBe("c"); });
  it("returns honest zero values on an empty database", () => { const stats = computeAnalytics({ submissions: [], issues: [], events: [] }, 7, now); expect(stats.total).toBe(0); expect(stats.resolutionRate).toBe(0); expect(stats.trend).toHaveLength(7); });
});
