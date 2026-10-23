import "server-only";

/** Display identity for one institution per deployment. No credentials are exposed. */
export function getOrganization(locale: "ru" | "kk", env: Record<string, string | undefined> = process.env) {
  const fallback = locale === "kk" ? "Университет қауымдастығы" : "Университетское сообщество";
  const name = env[locale === "kk" ? "ORGANIZATION_NAME_KK" : "ORGANIZATION_NAME_RU"]?.trim()
    || env.ORGANIZATION_NAME?.trim()
    || fallback;
  const initials = env.ORGANIZATION_INITIALS?.trim()
    || name.split(/\s+/u).filter(Boolean).slice(0, 2).map(word => Array.from(word)[0]).join("").toLocaleUpperCase(locale);
  return { name, initials: Array.from(initials).slice(0, 4).join("") };
}
