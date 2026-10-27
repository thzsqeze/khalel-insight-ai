import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeSubmission } from "@/lib/server/ai";
import type { Submission } from "@/lib/types";
const submission: Submission = {
  id: "1",
  reference: "UV-1",
  role: "student",
  category: "education",
  description: "Не хватает практических занятий по предмету.",
  faculty: null,
  locale: "ru",
  aiConsent: false,
  createdAt: new Date().toISOString(),
  issueId: null,
  analysis: null,
  analysisStatus: "pending",
};
beforeEach(() => {
  vi.stubEnv("AI_PROVIDER", "groq");
  vi.stubEnv("GROQ_API_KEY", "");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Unexpected provider request")));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("AI safety and availability", () => {
  it("skips provider processing when consent is missing even with production enabled", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(await analyzeSubmission(submission)).toEqual({
      analysis: null,
      status: "skipped",
      reason: "consent",
    });
  });
  it("returns failed without losing report when provider credentials are unavailable", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(await analyzeSubmission({ ...submission, aiConsent: true })).toEqual({
      analysis: null,
      status: "failed",
      reason: "configuration",
    });
  });
  it("never fabricates analysis when an obsolete demo flag is set", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    vi.stubEnv("OPENAI_API_KEY", "");
    const result = await analyzeSubmission({ ...submission, aiConsent: true });
    expect(result).toEqual({ analysis: null, status: "failed", reason: "configuration" });
  });
  it("withholds text containing uncertain person identifiers before provider access", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const result = await analyzeSubmission({
      ...submission,
      aiConsent: true,
      description: "Преподаватель Айгүл обратилась ко мне.",
    });
    expect(result.status).toBe("failed");
    expect(result.reason).toBe("privacy");
    expect(result.analysis).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
