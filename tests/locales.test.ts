import analyticsRu from "@/messages/analytics-ru.json";
import analyticsKk from "@/messages/analytics-kk.json";
import assistantRu from "@/messages/assistant-ru.json";
import assistantKk from "@/messages/assistant-kk.json";
import teamRu from "@/messages/team-ru.json";
import teamKk from "@/messages/team-kk.json";
import ticketsRu from "@/messages/tickets-ru.json";
import ticketsKk from "@/messages/tickets-kk.json";
import { describe, expect, it } from "vitest";
import publicRu from "@/messages/public-ru.json";
import publicKk from "@/messages/public-kk.json";
import adminRu from "@/messages/admin-ru.json";
import adminKk from "@/messages/admin-kk.json";
function flatten(value: Record<string, unknown>, prefix = ""): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) =>
      typeof child === "string"
        ? [[`${prefix}${key}`, child]]
        : Object.entries(flatten(child as Record<string, unknown>, `${prefix}${key}.`)),
    ),
  );
}
describe("complete Russian and Kazakh catalogs", () => {
  for (const [scope, ru, kk] of [
    ["public", publicRu, publicKk],
    ["admin", adminRu, adminKk],
    ["analytics", analyticsRu, analyticsKk],
    ["team", teamRu, teamKk],
    ["tickets", ticketsRu, ticketsKk],
    ["assistant", assistantRu, assistantKk],
  ] as const) {
    it(`${scope} provides all translated keys and preserves interpolation parameters`, () => {
      const russian = flatten(ru),
        kazakh = flatten(kk);
      expect(Object.keys(kazakh).sort()).toEqual(Object.keys(russian).sort());
      for (const key of Object.keys(russian)) {
        expect(kazakh[key].trim(), key).not.toBe("");
        const parameters = (text: string) =>
          [...new Set([...text.matchAll(/\{(\w+)(?:,|\})/g)].map((match) => match[1]))].sort();
        expect(parameters(kazakh[key]), key).toEqual(parameters(russian[key]));
      }
    });
  }
});
