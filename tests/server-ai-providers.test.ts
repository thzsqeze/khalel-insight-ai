import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeSubmission } from "@/lib/server/ai";
import type { Submission } from "@/lib/types";

const submission: Submission = {
  id: "private-id",
  reference: "UV-private-reference",
  role: "student",
  category: "education",
  description: "Не хватает практических занятий по предмету.",
  faculty: "private-faculty",
  locale: "ru",
  aiConsent: true,
  createdAt: "2026-10-27T00:00:00.000Z",
  issueId: null,
  analysis: null,
  analysisStatus: "pending",
};
const validAnalysis = {
  category: "education",
  summary: "Нужно больше практических занятий.",
  keywords: ["практика", "занятия"],
  urgency: "medium",
  sensitiveData: false,
  confidence: 0.85,
};
const accountId = "0123456789abcdef0123456789abcdef";
const fetchMock = vi.fn<typeof fetch>();

function chatResponse(
  content: unknown = JSON.stringify(validAnalysis),
  finishReason = "stop",
  refusal: string | null = null,
) {
  return Response.json({
    id: "chatcmpl-test",
    object: "chat.completion",
    created: 1793059200,
    model: "test-model",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content,
          refusal,
          reasoning: "private reasoning must not be saved",
        },
        logprobs: null,
        finish_reason: finishReason,
      },
    ],
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
  });
}

function openAIResponse() {
  return Response.json({
    id: "resp-test",
    object: "response",
    created_at: 1793059200,
    status: "completed",
    error: null,
    incomplete_details: null,
    model: "gpt-4.1-mini",
    output: [
      {
        id: "msg-test",
        type: "message",
        status: "completed",
        role: "assistant",
        content: [{ type: "output_text", text: JSON.stringify(validAnalysis), annotations: [] }],
      },
    ],
  });
}

function request(index = 0) {
  const [url, init] = fetchMock.mock.calls[index];
  return {
    url: String(url),
    method: init?.method,
    headers: new Headers(init?.headers),
    body: JSON.parse(String(init?.body)),
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => {
    throw new Error("Unexpected HTTP request");
  });
  vi.stubGlobal("fetch", fetchMock);
  for (const name of [
    "AI_PROVIDER",
    "AI_FALLBACK_PROVIDER",
    "GROQ_API_KEY",
    "GROQ_MODEL",
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_AI_MODEL",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "OPENAI_EMBEDDING_MODEL",
    "OPENAI_BASE_URL",
    "OPENAI_ORG_ID",
    "OPENAI_PROJECT_ID",
    "OPENAI_ADMIN_KEY",
    "OPENAI_CUSTOM_HEADERS",
    "OPENAI_LOG",
  ])
    vi.stubEnv(name, "");
  vi.stubEnv("GROQ_API_KEY", "groq-test-key");
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", accountId);
  vi.stubEnv("CLOUDFLARE_API_TOKEN", "cloudflare-test-key");
  vi.stubEnv("OPENAI_API_KEY", "openai-test-key");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AI provider HTTP boundaries", () => {
  it.each([
    [
      "Ужасное расписания, отвратительное, поздно вышло",
      "[REDACTED] расписания, отвратительное, поздно вышло",
    ],
    [
      "Безобразно составлено расписание, занятия начинаются слишком поздно.",
      "[REDACTED] составлено расписание, занятия начинаются слишком поздно.",
    ],
    [
      "Сабақтар кеш басталады, кесте тым кеш жарияланды.",
      "[REDACTED] кеш басталады, кесте тым кеш жарияланды.",
    ],
    [
      "Әділетсіз жасалған кесте, үзілістер өте қысқа.",
      "[REDACTED] жасалған кесте, үзілістер өте қысқа.",
    ],
    [
      "Иван Петров сообщил: расписание опубликовано слишком поздно. test@example.com",
      "[REDACTED] сообщил: расписание опубликовано слишком поздно. [REDACTED]",
    ],
    ["Инет не работает, Айгүл решает проблему", "Инет не работает, [REDACTED] решает проблему"],
    ["Ли сообщает: расписание вышло поздно.", "[REDACTED] сообщает: расписание вышло поздно."],
    ["АЙГҮЛ сообщает: расписание вышло поздно.", "[REDACTED] сообщает: расписание вышло поздно."],
  ])(
    "analyzes useful complaint text after removing uncertain capitalized words: %s",
    async (description, sanitized) => {
      fetchMock.mockResolvedValueOnce(chatResponse());
      const result = await analyzeSubmission({ ...submission, description });
      expect(result.status).toBe("completed");
      expect(result.analysis?.sensitiveData).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(request().body.messages[1]).toEqual({ role: "user", content: sanitized });
    },
  );

  it.each([
    "Айгүл",
    "Иван Петров",
    "test@example.com +7 777 123 45 67",
    "Айгүл и Иван, +7 777 123 45 67",
    "@student [REDACTED] !!!",
  ])(
    "does not send identifiers or meaningless remnants to the provider: %s",
    async (description) => {
      const result = await analyzeSubmission({ ...submission, description });
      expect(result.status).toBe("failed");
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("defaults to Groq and only sends redacted description in a strict schema request", async () => {
    vi.stubEnv("AI_PROVIDER", undefined);
    vi.stubEnv("OPENAI_BASE_URL", "https://unrelated.example/api");
    vi.stubEnv("OPENAI_ORG_ID", "private-openai-org");
    vi.stubEnv("OPENAI_PROJECT_ID", "private-openai-project");
    fetchMock.mockResolvedValueOnce(chatResponse());
    const result = await analyzeSubmission({
      ...submission,
      description: "Не хватает практики. test@example.com",
    });
    expect(result).toEqual({
      status: "completed",
      analysis: {
        ...validAnalysis,
        sensitiveData: true,
        source: "groq",
        reviewed: false,
        reviewNeeded: true,
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sent = request();
    expect(sent.url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(sent.method).toBe("POST");
    expect(sent.headers.get("authorization")).toBe("Bearer groq-test-key");
    expect(sent.headers.get("openai-organization")).toBeNull();
    expect(sent.headers.get("openai-project")).toBeNull();
    expect(sent.body).toMatchObject({
      model: "openai/gpt-oss-120b",
      reasoning_effort: "low",
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "feedback_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["category", "summary", "keywords", "urgency", "sensitiveData", "confidence"],
          },
        },
      },
    });
    expect(sent.body.messages).toHaveLength(2);
    expect(sent.body.messages[0]).toMatchObject({
      role: "system",
      content: expect.stringContaining("summary and keywords in Russian"),
    });
    expect(sent.body.messages[1]).toEqual({
      role: "user",
      content: "Не хватает практики. [REDACTED]",
    });
    expect(JSON.stringify(sent.body)).not.toMatch(
      /test@example.com|private-id|private-reference|private-faculty/,
    );
    expect(JSON.stringify(result)).not.toContain("reasoning");
  });

  it("uses the configured strict-compatible Groq model and Kazakh prompt", async () => {
    vi.stubEnv("GROQ_MODEL", "openai/gpt-oss-20b");
    const kazakh = {
      ...validAnalysis,
      summary: "Қосымша практикалық сабақтар қажет.",
      keywords: ["сабақ", "тәжірибе"],
    };
    fetchMock.mockResolvedValueOnce(chatResponse(JSON.stringify(kazakh)));
    const result = await analyzeSubmission({
      ...submission,
      locale: "kk",
      description: "Қосымша практикалық сабақтар қажет.",
    });
    expect(result.analysis).toEqual({
      ...kazakh,
      source: "groq",
      reviewed: false,
      reviewNeeded: true,
    });
    expect(request().body.model).toBe("openai/gpt-oss-20b");
    expect(request().body.messages[0].content).toContain("summary and keywords in Kazakh");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      "ru",
      "Обратная связь: ",
      "Обратная связь: не хватает практических занятий и обратной связи по заданиям.",
      ["практика", "занятия"],
    ],
    [
      "kk",
      "Кері байланыс: ",
      "Кері байланыс: сабақтардағы практикалық тапсырмалар санын көбейту қажет.",
      ["сабақ", "тәжірибе"],
    ],
  ] as const)(
    "accepts neutral %s summaries and requests an impersonal format without weakening identifiers",
    async (locale, prefix, summary, keywords) => {
      fetchMock.mockResolvedValueOnce(
        chatResponse(JSON.stringify({ ...validAnalysis, summary, keywords })),
      );
      const result = await analyzeSubmission({ ...submission, locale });
      expect(result.status).toBe("completed");
      expect(result.analysis?.summary).toBe(summary);
      const prompt = request().body.messages[0].content;
      expect(prompt).toContain(`Start the summary exactly with "${prefix}"`);
      expect(prompt).toContain("impersonal");
      expect(prompt).toContain("lowercase");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("uses Cloudflare account, token and documented JSON schema without Gateway or embeddings", async () => {
    vi.stubEnv("AI_PROVIDER", "cloudflare");
    fetchMock.mockResolvedValueOnce(chatResponse());
    expect((await analyzeSubmission(submission)).analysis).toEqual({
      ...validAnalysis,
      source: "cloudflare",
      reviewed: false,
      reviewNeeded: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sent = request();
    expect(sent.url).toBe(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`,
    );
    expect(sent.headers.get("authorization")).toBe("Bearer cloudflare-test-key");
    expect(sent.body).toMatchObject({
      model: "@cf/qwen/qwen3-30b-a3b-fp8",
      response_format: {
        type: "json_schema",
        json_schema: {
          type: "object",
          additionalProperties: false,
          required: ["category", "summary", "keywords", "urgency", "sensitiveData", "confidence"],
        },
      },
    });
    expect(sent.body).not.toHaveProperty("reasoning_effort");
    expect(sent.body).not.toHaveProperty("gateway");
    expect([...sent.headers.keys()].some((name) => name.startsWith("cf-aig"))).toBe(false);
  });

  it("does not inherit OpenAI custom credentials, metadata or debug logging into free providers", async () => {
    vi.stubEnv(
      "OPENAI_CUSTOM_HEADERS",
      "Authorization: Bearer unrelated-secret\nX-Private-Account: private-metadata\ncf-aig-log-override: true",
    );
    vi.stubEnv("OPENAI_LOG", "debug");
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(chatResponse());
    expect((await analyzeSubmission(submission)).status).toBe("completed");
    expect(request().headers.get("authorization")).toBe("Bearer groq-test-key");
    expect(request().headers.get("x-private-account")).toBeNull();
    expect(request().headers.get("cf-aig-log-override")).toBeNull();
    expect(debug).not.toHaveBeenCalled();
  });

  it.each(["groq", "cloudflare", "openai", "disabled"])(
    "withholds every HTTP call without consent for %s",
    async (provider) => {
      vi.stubEnv("AI_PROVIDER", provider);
      expect(await analyzeSubmission({ ...submission, aiConsent: false })).toEqual({
        analysis: null,
        status: "skipped",
        reason: "consent",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each(["Преподаватель Айгүл обратилась ко мне.", "", "   "])(
    "withholds unsafe or empty outbound text: %s",
    async (description) => {
      expect(await analyzeSubmission({ ...submission, description })).toEqual({
        analysis: null,
        status: "failed",
        reason: "privacy",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("skips explicitly disabled AI without HTTP even when credentials are configured", async () => {
    vi.stubEnv("AI_PROVIDER", "disabled");
    expect(await analyzeSubmission(submission)).toEqual({
      analysis: null,
      status: "skipped",
      reason: "disabled",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["groq", "GROQ_API_KEY", ""],
    ["cloudflare", "CLOUDFLARE_API_TOKEN", ""],
    ["cloudflare", "CLOUDFLARE_ACCOUNT_ID", ""],
    ["cloudflare", "CLOUDFLARE_ACCOUNT_ID", "../other-account"],
    ["cloudflare", "CLOUDFLARE_ACCOUNT_ID", "z".repeat(32)],
    ["openai", "OPENAI_API_KEY", ""],
    ["unknown", "GROQ_API_KEY", "still-configured"],
    ["groq", "GROQ_MODEL", "unsupported-model"],
  ])("fails closed with %s and invalid %s", async (provider, name, value) => {
    vi.stubEnv("AI_PROVIDER", provider);
    vi.stubEnv(name, value);
    expect(await analyzeSubmission(submission)).toEqual({
      analysis: null,
      status: "failed",
      reason: "configuration",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["groq", "cloudflare"])(
    "never retries or falls back after %s rate limiting",
    async (provider) => {
      vi.stubEnv("AI_PROVIDER", provider);
      fetchMock.mockResolvedValueOnce(
        Response.json(
          { error: { message: "Rate limited", type: "rate_limit_error" } },
          { status: 429 },
        ),
      );
      expect(await analyzeSubmission(submission)).toEqual({
        analysis: null,
        status: "failed",
        reason: "rate_limit",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(request().url).not.toContain("api.openai.com");
    },
  );

  it("uses an explicitly configured Cloudflare reserve only after a Groq quota failure", async () => {
    vi.stubEnv("AI_FALLBACK_PROVIDER", "cloudflare");
    fetchMock
      .mockResolvedValueOnce(
        Response.json({ error: { message: "Quota reached" } }, { status: 429 }),
      )
      .mockResolvedValueOnce(chatResponse());
    const result = await analyzeSubmission({
      ...submission,
      description: "Ужасное расписания, отвратительное, поздно вышло test@example.com",
    });
    expect(result.status).toBe("completed");
    expect(result.analysis?.source).toBe("cloudflare");
    expect(result.analysis?.sensitiveData).toBe(true);
    expect(result.embedding).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(request().url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(request(1).url).toBe(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`,
    );
    expect(request().headers.get("authorization")).toBe("Bearer groq-test-key");
    expect(request(1).headers.get("authorization")).toBe("Bearer cloudflare-test-key");
    expect(request(1).body.messages).toEqual(request().body.messages);
    expect(request(1).body.messages[1].content).toBe(
      "[REDACTED] расписания, отвратительное, поздно вышло [REDACTED]",
    );
    expect(JSON.stringify(request(1).body)).not.toMatch(
      /test@example.com|private-id|private-reference|private-faculty|groq-test-key/,
    );
  });

  it.each(["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"])(
    "does not call an incompletely configured Cloudflare reserve with missing %s",
    async (name) => {
      vi.stubEnv("AI_FALLBACK_PROVIDER", "cloudflare");
      vi.stubEnv(name, "");
      fetchMock.mockResolvedValueOnce(
        Response.json({ error: { message: "Quota reached" } }, { status: 429 }),
      );
      expect(await analyzeSubmission(submission)).toEqual({
        analysis: null,
        status: "failed",
        reason: "rate_limit",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    [429, "rate_limit"],
    [503, "provider"],
  ])("stops after a failing Cloudflare reserve request (%s)", async (status, reason) => {
    vi.stubEnv("AI_FALLBACK_PROVIDER", "cloudflare");
    fetchMock
      .mockResolvedValueOnce(
        Response.json({ error: { message: "Quota reached" } }, { status: 429 }),
      )
      .mockResolvedValueOnce(
        Response.json({ error: { message: "Reserve unavailable" } }, { status }),
      );
    expect(await analyzeSubmission(submission)).toEqual({
      analysis: null,
      status: "failed",
      reason,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([401, 403, 500])(
    "never uses the reserve after a non-quota Groq error (%s)",
    async (status) => {
      vi.stubEnv("AI_FALLBACK_PROVIDER", "cloudflare");
      fetchMock.mockResolvedValueOnce(
        Response.json({ error: { message: "Provider unavailable" } }, { status }),
      );
      expect(await analyzeSubmission(submission)).toEqual({
        analysis: null,
        status: "failed",
        reason: "provider",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["groq", "cloudflare"])(
    "fails without retry after %s network errors",
    async (provider) => {
      vi.stubEnv("AI_PROVIDER", provider);
      vi.stubEnv("AI_FALLBACK_PROVIDER", "cloudflare");
      fetchMock.mockRejectedValueOnce(new TypeError("Network unavailable"));
      expect(await analyzeSubmission(submission)).toEqual({
        analysis: null,
        status: "failed",
        reason: "provider",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("aborts a stalled request after 20 seconds without retry or fallback", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    );
    const pending = analyzeSubmission(submission);
    await vi.advanceTimersByTimeAsync(20000);
    expect(await pending).toEqual({ analysis: null, status: "failed", reason: "provider" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(["groq", "cloudflare"])(
    "rejects non-final, refused, empty and malformed %s responses",
    async (provider) => {
      vi.stubEnv("AI_PROVIDER", provider);
      vi.stubEnv("AI_FALLBACK_PROVIDER", "cloudflare");
      const responses = [
        chatResponse(JSON.stringify(validAnalysis), "length"),
        chatResponse(JSON.stringify(validAnalysis), "content_filter"),
        chatResponse(JSON.stringify(validAnalysis), "stop", "refused"),
        chatResponse(null),
        chatResponse(""),
        chatResponse("not json"),
        Response.json({ choices: [] }),
      ];
      for (const response of responses) {
        fetchMock.mockResolvedValueOnce(response);
        expect(await analyzeSubmission(submission)).toEqual({
          analysis: null,
          status: "failed",
          reason: "invalid_response",
        });
      }
      expect(fetchMock).toHaveBeenCalledTimes(responses.length);
    },
  );

  it.each([
    { category: "invalid" },
    { urgency: "invalid" },
    { confidence: -0.1 },
    { confidence: 1.1 },
    { summary: "" },
    { summary: "   " },
    { summary: "а".repeat(1001) },
    { keywords: [] },
    { keywords: [" "] },
    { keywords: ["а".repeat(81)] },
    { keywords: Array(7).fill("тема") },
    { sensitiveData: "false" },
    { extra: "unexpected" },
  ])("rejects schema-invalid generated fields: %j", async (fields) => {
    vi.stubEnv("AI_FALLBACK_PROVIDER", "cloudflare");
    fetchMock.mockResolvedValueOnce(chatResponse(JSON.stringify({ ...validAnalysis, ...fields })));
    expect(await analyzeSubmission(submission)).toEqual({
      analysis: null,
      status: "failed",
      reason: "invalid_response",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    { summary: "Преподаватель Айгүл обратилась ко мне." },
    { summary: "Кері байланыс: Айгүл тапсырмаларды тексермейді." },
    { summary: "Обратная связь: студент айгүл обратилась ко мне." },
    { summary: "test@example.com" },
    { keywords: ["@student"] },
  ])(
    "rejects identifying generated fields without returning their contents: %j",
    async (fields) => {
      vi.stubEnv("AI_FALLBACK_PROVIDER", "cloudflare");
      fetchMock.mockResolvedValueOnce(
        chatResponse(JSON.stringify({ ...validAnalysis, ...fields })),
      );
      expect(await analyzeSubmission(submission)).toEqual({
        analysis: null,
        status: "failed",
        reason: "privacy",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("uses OpenAI Responses and original 1536-dimensional embeddings only when explicitly selected", async () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    const vector = Array(1536).fill(0.125);
    const bytes = Buffer.from(new Float32Array(vector).buffer).toString("base64");
    fetchMock.mockResolvedValueOnce(openAIResponse()).mockResolvedValueOnce(
      Response.json({
        object: "list",
        model: "text-embedding-3-small",
        data: [{ object: "embedding", index: 0, embedding: bytes }],
        usage: { prompt_tokens: 20, total_tokens: 20 },
      }),
    );
    expect(await analyzeSubmission(submission)).toEqual({
      status: "completed",
      analysis: { ...validAnalysis, source: "openai", reviewed: false, reviewNeeded: true },
      embedding: vector,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(request().url).toBe("https://api.openai.com/v1/responses");
    expect(request().headers.get("authorization")).toBe("Bearer openai-test-key");
    expect(request().body).toMatchObject({ model: "gpt-4.1-mini", store: false });
    expect(request(1).url).toBe("https://api.openai.com/v1/embeddings");
    expect(request(1).body).toMatchObject({
      model: "text-embedding-3-small",
      dimensions: 1536,
      input: submission.description,
    });
  });

  it("keeps a valid explicit OpenAI classification when embeddings fail", async () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    fetchMock
      .mockResolvedValueOnce(openAIResponse())
      .mockResolvedValueOnce(Response.json({ error: { message: "Unavailable" } }, { status: 503 }));
    const result = await analyzeSubmission(submission);
    expect(result.status).toBe("completed");
    expect(result.analysis?.source).toBe("openai");
    expect(result.embedding).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
