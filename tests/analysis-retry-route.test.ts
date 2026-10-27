import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/submissions/[id]/analysis/route";

const state = vi.hoisted(() => ({
  analyze: vi.fn(),
  getSubmission: vi.fn(),
  saveAnalysis: vi.fn(),
  consumeRateLimit: vi.fn(),
}));
vi.mock("@/lib/server/auth", () => ({ requireAdmin: vi.fn().mockResolvedValue({ id: "admin" }) }));
vi.mock("@/lib/server/ai", () => ({ analyzeSubmission: state.analyze }));
vi.mock("@/lib/server/repository", () => ({ getRepository: () => state }));
vi.mock("@/lib/server/diagnostics", () => ({ captureServerError: vi.fn() }));

const id = "80000000-0000-4000-8000-000000000001";
function retry() {
  return POST(
    new Request(`http://localhost:3000/api/admin/submissions/${id}/analysis`, {
      method: "POST",
      headers: { origin: "http://localhost:3000", host: "localhost:3000" },
    }),
    { params: Promise.resolve({ id }) },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
  state.getSubmission.mockResolvedValue({ id, aiConsent: true });
  state.consumeRateLimit.mockResolvedValue(true);
  state.saveAnalysis.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("administrator AI retry reports the actual outcome", () => {
  it.each([
    ["privacy", 422],
    ["rate_limit", 429],
    ["configuration", 503],
    ["provider", 503],
    ["invalid_response", 503],
    ["disabled", 503],
  ])("returns a safe error for %s instead of success", async (reason, status) => {
    state.analyze.mockResolvedValue({ analysis: null, status: "failed", reason });
    const response = await retry();
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: `analysis_${reason}` });
    expect(state.saveAnalysis).toHaveBeenCalledWith(id, null, "failed", undefined);
  });
  it("only reports success when the analysis completed and was saved", async () => {
    const analysis = { source: "groq", summary: "Расписание опубликовано поздно." };
    state.analyze.mockResolvedValue({ analysis, status: "completed" });
    const response = await retry();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, analysisStatus: "completed" });
    expect(state.saveAnalysis).toHaveBeenCalledWith(id, analysis, "completed", undefined);
  });
  it("does not run or save analysis without the author's consent", async () => {
    state.getSubmission.mockResolvedValue({ id, aiConsent: false });
    const response = await retry();
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "consent_required" });
    expect(state.analyze).not.toHaveBeenCalled();
    expect(state.saveAnalysis).not.toHaveBeenCalled();
  });
});
