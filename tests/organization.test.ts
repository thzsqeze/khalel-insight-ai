import { describe, expect, it } from "vitest";
import { getOrganization } from "@/lib/server/organization";

describe("institution deployment identity", () => {
  it("uses neutral localized defaults", () => {
    expect(getOrganization("ru", {}).name).toBe("Университетское сообщество");
    expect(getOrganization("kk", {}).name).toBe("Университет қауымдастығы");
  });
  it("selects the requested language and falls back to a shared name", () => {
    const env = { ORGANIZATION_NAME: "Shared University", ORGANIZATION_NAME_KK: "  Жаңа университет  " };
    expect(getOrganization("kk", env)).toEqual({ name: "Жаңа университет", initials: "ЖУ" });
    expect(getOrganization("ru", env)).toEqual({ name: "Shared University", initials: "SU" });
  });
  it("handles blank configuration and limits custom initials", () => {
    expect(getOrganization("ru", { ORGANIZATION_NAME_RU: "  " }).initials).toBe("УС");
    expect(getOrganization("ru", { ORGANIZATION_INITIALS: "ABCDE" }).initials).toBe("ABCD");
  });
  it("returns only public identity and preserves literal display text", () => {
    expect(getOrganization("ru", { ORGANIZATION_NAME: "O'Neil {Campus}", SECRET: "private" }))
      .toEqual({ name: "O'Neil {Campus}", initials: "O{" });
  });
});
