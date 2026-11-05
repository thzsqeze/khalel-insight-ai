import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/feedback/assist/route";

const repository = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  createSubmission: vi.fn(),
  saveAnalysis: vi.fn(),
}));
vi.mock("@/lib/server/repository", () => ({ getRepository: () => repository }));
vi.mock("@/lib/server/diagnostics", () => ({ captureServerError: vi.fn() }));

const fetchMock = vi.fn<typeof fetch>();
const content = {
  draft: "Прошу добавить практические занятия по предмету.",
  suggestedCategory: "education",
  questionIds: ["frequency", "impact"],
};
const accountId = "0123456789abcdef0123456789abcdef";

function input() {
  return {
    description: "Не хватает практических занятий по предмету.",
    locale: "ru",
    assistantConsent: true,
    website: "",
    startedAt: Date.now() - 5000,
  };
}

function providerResponse(
  value: unknown = content,
  finishReason = "stop",
  refusal: string | null = null,
) {
  return Response.json({
    id: "chatcmpl-assistant-test",
    object: "chat.completion",
    created: 1793059200,
    model: "test-model",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: typeof value === "string" ? value : JSON.stringify(value),
          refusal,
          reasoning: "private reasoning must not leave the provider response",
        },
        logprobs: null,
        finish_reason: finishReason,
      },
    ],
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
  });
}

function assist(patch: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return POST(
    new Request("http://localhost:3000/api/feedback/assist", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        host: "localhost:3000",
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify({ ...input(), ...patch }),
    }),
  );
}

function sent(index = 0) {
  const [url, init] = fetchMock.mock.calls[index];
  return { url: String(url), body: JSON.parse(String(init?.body)) };
}

beforeEach(() => {
  vi.clearAllMocks();
  repository.consumeRateLimit.mockResolvedValue(true);
  fetchMock.mockReset();
  fetchMock.mockRejectedValue(new Error("Unexpected provider request"));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
  vi.stubEnv("TRUSTED_IP_HEADER", "");
  vi.stubEnv("AI_PROVIDER", "groq");
  vi.stubEnv("AI_FALLBACK_PROVIDER", "");
  vi.stubEnv("GROQ_API_KEY", "groq-test-key");
  vi.stubEnv("GROQ_MODEL", "openai/gpt-oss-120b");
  vi.stubEnv("CLOUDFLARE_API_TOKEN", "cloudflare-test-key");
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", accountId);
  vi.stubEnv("CLOUDFLARE_AI_MODEL", "@cf/qwen/qwen3-30b-a3b-fp8");
  vi.stubEnv("OPENAI_API_KEY", "openai-test-key");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("public draft assistant", () => {
  it("returns a bounded suggestion without creating a submission or saving analysis", async () => {
    fetchMock.mockResolvedValueOnce(providerResponse());
    const response = await assist();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ...content, redacted: false });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(repository.createSubmission).not.toHaveBeenCalled();
    expect(repository.saveAnalysis).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sent().url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(sent().body).toMatchObject({
      max_completion_tokens: 1500,
      response_format: { type: "json_schema", json_schema: { strict: true } },
    });
    expect(repository.consumeRateLimit).toHaveBeenCalledWith(
      expect.any(String),
      "draft-assistant",
      5,
      3600000,
    );
    expect(repository.consumeRateLimit).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-f0-9]{64}$/),
      "draft-assistant-global",
      100,
      86400000,
    );
  });

  it.each([false, undefined, "true"])("requires explicit assistant consent: %s", async (value) => {
    const response = await assist({ assistantConsent: value });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "assistant_consent" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(repository.consumeRateLimit).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests before reading or sending draft content", async () => {
    const response = await assist({}, { origin: "https://attacker.example" });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "forbidden" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(repository.consumeRateLimit).not.toHaveBeenCalled();
  });

  it.each([
    { description: "short" },
    { description: "а".repeat(5001) },
    { locale: "en" },
    { website: "spam.example" },
    { website: undefined },
    { startedAt: 0 },
    { startedAt: 9999999999999 },
    { faculty: "private faculty" },
    { role: "student" },
    { model: "client-chosen-model" },
  ])("rejects invalid or extraneous input: %j", async (patch) => {
    const response = await assist(patch);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_input" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bounds streamed body bytes even without a content-length header", async () => {
    const response = await assist({ description: "а".repeat(9000) });
    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    { body: "not json", contentType: "application/json" },
    { body: JSON.stringify(input()), contentType: "text/plain" },
  ])("requires a valid JSON body", async ({ body, contentType }) => {
    const response = await POST(
      new Request("http://localhost:3000/api/feedback/assist", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          host: "localhost:3000",
          "content-type": contentType,
        },
        body,
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_input" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends only redacted description and keeps instructions in a separate system message", async () => {
    fetchMock.mockResolvedValueOnce(providerResponse());
    const response = await assist({ description: "Не хватает практики. test@example.com" });
    expect(await response.json()).toEqual({ ...content, redacted: true });
    expect(sent().body.messages).toEqual([
      { role: "system", content: expect.stringContaining("Russian") },
      { role: "user", content: "Не хватает практики. [REDACTED]" },
    ]);
    expect(JSON.stringify(sent().body)).not.toMatch(/test@example.com|startedAt|assistantConsent/);
  });

  it("requests Kazakh output for the Kazakh form", async () => {
    const kazakh = {
      ...content,
      draft:
        "Кері байланыс: сабақ кестесі тым кеш жарияланады, оқу аптасын жоспарлау қиын; кестені алдын ала жариялауды сұраймын.",
      suggestedCategory: "timetable",
    };
    fetchMock.mockResolvedValueOnce(providerResponse(kazakh));
    const response = await assist({
      locale: "kk",
      description:
        "сабақ кестесі тым кеш жарияланады, оқу аптасын жоспарлау қиын. кестені алдын ала жариялауды сұраймын.",
    });
    expect(await response.json()).toEqual({ ...kazakh, redacted: false });
    expect(sent().body.messages[0].content).toContain("Kazakh");
  });

  it.each([
    "преподаватель айгүл опубликовала расписание поздно",
    "мой телефон: +7 777 123 45 67 и почта: me@example.com",
  ])(
    "blocks identifying or useless input without contacting a provider: %s",
    async (description) => {
      const response = await assist({ description });
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ error: "assistant_privacy" });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    { draft: " " },
    { draft: "короткий текст" },
    { draft: "а".repeat(2001) },
    { suggestedCategory: "invented" },
    { questionIds: ["name"] },
    { questionIds: ["frequency", "frequency"] },
    { questionIds: ["frequency", "impact", "desired_change", "frequency"] },
    { redacted: false },
    { provider: "groq" },
  ])("rejects invalid structured suggestions: %j", async (patch) => {
    fetchMock.mockResolvedValueOnce(providerResponse({ ...content, ...patch }));
    const response = await assist();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "assistant_invalid_response" });
  });

  it.each([
    "Прошу связаться с test@example.com для обсуждения занятий.",
    "Прошу проверить занятия: Айгүл постоянно опаздывает.",
    "Прошу проверить: преподаватель айгүл опаздывает.",
    "Прошу обсудить [REDACTED] и добавить практику.",
    "Прошу проверить занятия: АЙГҮЛ постоянно опаздывает.",
    "Прошу проверить занятия: Ли постоянно опаздывает.",
    "Кері байланыс: сабақ кестесі тым кеш жарияланады. Кестені алдын ала жариялауды сұраймын.",
  ])("withholds identifying or placeholder-bearing output: %s", async (draft) => {
    fetchMock.mockResolvedValueOnce(providerResponse({ ...content, draft }));
    const response = await assist();
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "assistant_privacy" });
  });

  it.each([
    ["not json", "stop", null],
    ["", "stop", null],
    [JSON.stringify(content), "length", null],
    [JSON.stringify(content), "stop", "refused"],
  ])("withholds incomplete or malformed provider replies", async (value, finishReason, refusal) => {
    fetchMock.mockResolvedValueOnce(providerResponse(value, finishReason!, refusal));
    const response = await assist();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "assistant_invalid_response" });
  });

  it("allows no generated questions when the draft has enough detail", async () => {
    fetchMock.mockResolvedValueOnce(providerResponse({ ...content, questionIds: [] }));
    expect(await (await assist()).json()).toEqual({ ...content, questionIds: [], redacted: false });
  });

  it.each([
    ["disabled", "assistant_disabled"],
    ["unknown", "assistant_configuration"],
  ])("fails closed for provider setting %s", async (provider, error) => {
    vi.stubEnv("AI_PROVIDER", provider);
    const response = await assist();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires configured credentials without falling back to a paid provider", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const response = await assist();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "assistant_configuration" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks requests when the per-client rate allowance is exhausted", async () => {
    repository.consumeRateLimit.mockResolvedValueOnce(false);
    const response = await assist();
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "rate_limited" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks provider requests when the installation budget is exhausted", async () => {
    repository.consumeRateLimit.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const response = await assist();
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "assistant_rate_limit" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows at most 100 provider attempts across clients in the shared budget window", async () => {
    vi.stubEnv("TRUSTED_IP_HEADER", "x-ingress-client-ip");
    let globalAttempts = 0;
    repository.consumeRateLimit.mockImplementation(
      async (_key, scope) => scope !== "draft-assistant-global" || ++globalAttempts <= 100,
    );
    fetchMock.mockImplementation(async () => providerResponse());
    for (let index = 0; index < 100; index++) {
      expect((await assist({}, { "x-ingress-client-ip": `192.0.2.${index}` })).status).toBe(200);
    }
    const exhausted = await assist({}, { "x-ingress-client-ip": "192.0.2.101" });
    expect(exhausted.status).toBe(429);
    expect(await exhausted.json()).toEqual({ error: "assistant_rate_limit" });
    expect(fetchMock).toHaveBeenCalledTimes(100);
    const keys = repository.consumeRateLimit.mock.calls
      .filter((call) => call[1] === "draft-assistant-global")
      .map((call) => call[0]);
    expect(new Set(keys).size).toBe(1);
  });

  it("uses explicit OpenAI selection only for the draft, without embeddings", async () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("OPENAI_MODEL", "gpt-4.1-mini");
    fetchMock.mockResolvedValueOnce(
      Response.json({
        id: "resp-assistant-test",
        object: "response",
        created_at: 1793059200,
        status: "completed",
        error: null,
        incomplete_details: null,
        model: "gpt-4.1-mini",
        output: [
          {
            id: "msg-assistant-test",
            type: "message",
            status: "completed",
            role: "assistant",
            content: [{ type: "output_text", text: JSON.stringify(content), annotations: [] }],
          },
        ],
      }),
    );
    expect(await (await assist()).json()).toEqual({ ...content, redacted: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sent().url).toBe("https://api.openai.com/v1/responses");
    expect(sent().body).toMatchObject({ store: false, max_output_tokens: 700 });
  });

  it("uses the opted-in reserve only after a Groq 429 and charges both provider attempts", async () => {
    vi.stubEnv("AI_FALLBACK_PROVIDER", "cloudflare");
    fetchMock
      .mockResolvedValueOnce(Response.json({ error: { message: "quota" } }, { status: 429 }))
      .mockResolvedValueOnce(providerResponse());
    const response = await assist();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ...content, redacted: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sent(1).url).toBe(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`,
    );
    expect(sent(1).body.messages).toEqual(sent().body.messages);
    expect(
      repository.consumeRateLimit.mock.calls.filter((call) => call[1] === "draft-assistant-global"),
    ).toHaveLength(2);
  });

  it("never bypasses the global budget through fallback", async () => {
    vi.stubEnv("AI_FALLBACK_PROVIDER", "cloudflare");
    repository.consumeRateLimit
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    fetchMock.mockResolvedValueOnce(
      Response.json({ error: { message: "quota" } }, { status: 429 }),
    );
    const response = await assist();
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "assistant_rate_limit" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403, 500])(
    "never retries or exposes provider errors after HTTP %s",
    async (status) => {
      vi.stubEnv("AI_FALLBACK_PROVIDER", "cloudflare");
      fetchMock.mockResolvedValueOnce(
        Response.json({ error: { message: "private provider details" } }, { status }),
      );
      const response = await assist();
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "assistant_provider" });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("maps an exhausted provider quota without configured fallback to a safe error", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ error: { message: "private quota details" } }, { status: 429 }),
    );
    const response = await assist();
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "assistant_rate_limit" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aborts stalled calls without retry or fallback", async () => {
    vi.useFakeTimers();
    vi.stubEnv("AI_FALLBACK_PROVIDER", "cloudflare");
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
    const pending = assist();
    await vi.advanceTimersByTimeAsync(20000);
    const response = await pending;
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "assistant_provider" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
