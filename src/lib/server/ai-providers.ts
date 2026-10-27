import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";
import type { Analysis } from "@/lib/types";

type AIProvider = {
  source: Analysis["source"];
  client: OpenAI;
  model: string;
};

export class InvalidAIResponseError extends Error {
  constructor() {
    super("Invalid AI response");
    this.name = "InvalidAIResponseError";
  }
}

function clientFor(apiKey: string, baseURL: string) {
  return new OpenAI({
    apiKey,
    baseURL,
    organization: null,
    project: null,
    adminAPIKey: null,
    webhookSecret: null,
    logLevel: "off",
    timeout: 20000,
    maxRetries: 0,
    // Do not forward SDK-wide OPENAI_CUSTOM_HEADERS to another provider/account.
    fetch: (url, init) =>
      fetch(url, {
        ...init,
        redirect: "error",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
          accept: "application/json",
        },
      }),
  });
}

function configuredProvider(source: string): AIProvider | null {
  if (source === "groq") {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
    if (!apiKey || !["openai/gpt-oss-120b", "openai/gpt-oss-20b"].includes(model)) return null;
    return { source, model, client: clientFor(apiKey, "https://api.groq.com/openai/v1") };
  }
  if (source === "cloudflare") {
    const apiKey = process.env.CLOUDFLARE_API_TOKEN?.trim();
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!apiKey || !accountId || !/^[a-f\d]{32}$/i.test(accountId)) return null;
    return {
      source,
      model: process.env.CLOUDFLARE_AI_MODEL || "@cf/qwen/qwen3-30b-a3b-fp8",
      client: clientFor(apiKey, `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`),
    };
  }
  if (source === "openai") {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return null;
    return {
      source,
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      client: clientFor(apiKey, "https://api.openai.com/v1"),
    };
  }
  // Disabled and unknown providers must never fall back to a paid service.
  return null;
}

export function getAIProvider(): AIProvider | null {
  return configuredProvider(process.env.AI_PROVIDER || "groq");
}

export function getAIFallbackProvider(): AIProvider | null {
  // Reserve is opt-in and restricted to the selected free-quota provider.
  return process.env.AI_FALLBACK_PROVIDER === "cloudflare"
    ? configuredProvider("cloudflare")
    : null;
}

export async function requestAnalysis(
  provider: AIProvider,
  schema: z.ZodType,
  systemPrompt: string,
  text: string,
): Promise<unknown> {
  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: text },
  ];
  const format = zodTextFormat(schema, "feedback_analysis");
  if (provider.source === "openai") {
    const response = await provider.client.responses.parse({
      model: provider.model,
      store: false,
      input: messages,
      text: { format },
      max_output_tokens: 700,
    });
    return response.output_parsed;
  }

  const response =
    provider.source === "groq"
      ? await provider.client.chat.completions.create({
          model: provider.model,
          messages,
          reasoning_effort: "low",
          max_completion_tokens: 1500,
          response_format: {
            type: "json_schema",
            json_schema: { name: format.name, strict: true, schema: format.schema },
          },
        })
      : await provider.client.post<OpenAI.Chat.Completions.ChatCompletion>("/chat/completions", {
          body: {
            model: provider.model,
            messages,
            max_tokens: 1500,
            // Workers AI's JSON Mode takes the schema directly, without OpenAI's wrapper.
            response_format: { type: "json_schema", json_schema: format.schema },
          },
        });
  const choice = response.choices?.[0];
  if (choice?.finish_reason !== "stop" || choice.message?.refusal || !choice.message?.content)
    throw new InvalidAIResponseError();
  // Reasoning is never read, logged or included in the saved analysis.
  try {
    return JSON.parse(choice.message.content);
  } catch {
    throw new InvalidAIResponseError();
  }
}
