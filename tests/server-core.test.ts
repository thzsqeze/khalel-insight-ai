import { describe, expect, it } from "vitest";
import { feedbackSchema, issuePatchSchema } from "@/lib/server/validation";
import {
  createTrackingCode,
  hashTrackingCode,
  isSafePublicTitle,
  prepareAIInput,
  redactForAI,
} from "@/lib/server/security";
const input = {
  role: "student",
  category: "education",
  description: "Не хватает практических занятий по предмету.",
  locale: "ru",
  consent: true,
  aiConsent: false,
  startedAt: Date.now() - 5000,
};
describe("server validation and privacy", () => {
  it("accepts anonymous submissions without faculty or identity", () =>
    expect(feedbackSchema.parse(input).faculty).toBeUndefined());
  it.each([
    { role: "admin" },
    { consent: false },
    { description: "short" },
    { website: "spam.example" },
    { startedAt: Date.now() + 1000 },
    { startedAt: Date.now() },
  ])("rejects invalid input %j", (patch) =>
    expect(feedbackSchema.safeParse({ ...input, ...patch }).success).toBe(false),
  );
  it("rejects unknown fields and public summaries containing contact information", () => {
    expect(feedbackSchema.safeParse({ ...input, email: "student@example.com" }).success).toBe(
      false,
    );
    expect(
      issuePatchSchema.safeParse({ publicSummary: "Свяжитесь с test@example.com для ответа" })
        .success,
    ).toBe(false);
  });
  it("creates unpredictable 192bit tracking codes with one way storage", () => {
    const a = createTrackingCode(),
      b = createTrackingCode();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(hashTrackingCode(a)).toHaveLength(64);
    expect(hashTrackingCode(a)).not.toContain(a);
  });
  it("redacts contact identifiers and suppresses uncertain named text", () => {
    const result = redactForAI(
      "Меня зовут Иван Петров, почта student@example.com и телефон +7 777 123 45 67.",
    );
    expect(result.text).not.toMatch(/Иван|Петров|student@|777/);
    expect(result.sensitiveData).toBe(true);
    expect(redactForAI("Преподаватель Айгүл обратилась ко мне.").safe).toBe(false);
  });
  it("accepts the common word for internet without allowing names in the same report", () => {
    const description = "Инет не работает, решите проблему";
    expect(redactForAI(description)).toEqual({
      text: description,
      safe: true,
      sensitiveData: false,
    });
    expect(redactForAI("Инет не работает, Айгүл решает проблему").safe).toBe(false);
  });
  it("preserves useful input after uncertain words are removed while keeping public output strict", () => {
    const complaint = "Ужасное расписания, отвратительное, поздно вышло";
    expect(prepareAIInput(complaint)).toEqual({
      text: "[REDACTED] расписания, отвратительное, поздно вышло",
      safe: true,
      sensitiveData: true,
    });
    expect(redactForAI(complaint).safe).toBe(false);
    expect(isSafePublicTitle(complaint)).toBe(false);
    expect(isSafePublicTitle("Обратная связь: Айгүл меняет расписание")).toBe(false);
  });
  it.each([
    "меня зовут айгүл, расписание вышло поздно",
    "моя фамилия иванова, расписание вышло поздно",
    "есімім айгүл, сабақтар кеш басталады",
    "преподаватель айгүл опубликовала расписание поздно",
    "студент айгүл сообщает, что расписание поздно вышло",
  ])("keeps identity-context blocks even for lowercase names: %s", (description) => {
    expect(prepareAIInput(description)).toEqual({ text: "", safe: false, sensitiveData: true });
  });
  it.each([
    "мой телефон: +7 777 123 45 67 и почта: me@example.com",
    "Менің телефоным: +7 777 123 45 67 және поштам: me@example.com",
    "[REDACTED] [REDACTED] !!!",
  ])("rejects contact labels or placeholders without a remaining complaint: %s", (description) => {
    const result = prepareAIInput(description);
    expect(result.safe).toBe(false);
    expect(result.text).toBe("");
  });
});
