import { z } from "zod";
import { categories } from "./types";

export const draftQuestionIds = ["frequency", "impact", "desired_change"] as const;
export type DraftQuestionId = (typeof draftQuestionIds)[number];

export const draftAssistantRequestSchema = z.strictObject({
  description: z.string().trim().min(20).max(5000),
  locale: z.enum(["ru", "kk"]),
  assistantConsent: z.literal(true),
  website: z.literal(""),
  startedAt: z
    .number()
    .finite()
    .refine((value) => Date.now() - value >= 2000 && Date.now() - value <= 24 * 60 * 60 * 1000),
});

export const draftAssistantResponseSchema = z.strictObject({
  draft: z.string().trim().min(20).max(2000),
  suggestedCategory: z.enum(categories),
  questionIds: z
    .array(z.enum(draftQuestionIds))
    .max(3)
    .refine((values) => new Set(values).size === values.length),
  redacted: z.boolean(),
});

export type DraftAssistantRequest = z.infer<typeof draftAssistantRequestSchema>;
export type DraftAssistantResponse = z.infer<typeof draftAssistantResponseSchema>;
