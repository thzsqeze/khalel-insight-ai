export const categories = ["timetable", "education", "infrastructure", "digital_services", "communication", "administration", "other"] as const;
export const statuses = ["new", "under_review", "in_progress", "resolved"] as const;
export const priorities = ["low", "medium", "high", "critical"] as const;
export type Category = typeof categories[number];
export type Status = typeof statuses[number];
export type Priority = typeof priorities[number];
export type Locale = "ru" | "kk";
export interface FeedbackInput {
  role: "student" | "teacher";
  category: Category;
  description: string;
  faculty?: string;
  locale: Locale;
  consent: boolean;
  aiConsent: boolean;
  website?: string;
  startedAt: number;
}
export interface Analysis {
  category: Category;
  summary: string;
  keywords: string[];
  urgency: Priority;
  sensitiveData: boolean;
  confidence: number;
  reviewNeeded: boolean;
  source: "demo" | "openai";
  reviewed: boolean;
}
export interface Submission {
  id: string;
  reference: string;
  role: "student" | "teacher";
  category: Category;
  description: string;
  faculty: string | null;
  locale: Locale;
  aiConsent: boolean;
  createdAt: string;
  issueId: string | null;
  analysis: Analysis | null;
  analysisStatus: "completed" | "pending" | "failed" | "skipped";
}
export interface Issue {
  id: string;
  reference: string;
  title: string;
  titleKk?: string;
  category: Category;
  status: Status;
  priority: Priority;
  owner: string | null;
  publicSummary: string | null;
  published: boolean;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
  count: number;
}
export interface StatusEvent {
  id: string;
  issueId: string;
  status: Status;
  note: string | null;
  actor: string;
  createdAt: string;
}
export interface SimilarReport { submission: Submission; similarity: number; }
export interface AdminSnapshot { submissions: Submission[]; issues: Issue[]; events: StatusEvent[]; demo: boolean; }
export interface IssueDetail { issue: Issue; submissions: Submission[]; events: StatusEvent[]; similar: SimilarReport[]; }
export interface PublicIssue { id: string; title: string; titleKk?: string; category: Category; status: Status; count: number; publicSummary: string; updatedAt: string; }
export interface TrackingResult { reference: string; category: Category; status: Status; createdAt: string; events: { status: Status; createdAt: string }[]; }
export interface AdminSession { id: string; email: string; role: "admin" | "moderator"; demo: boolean; }
