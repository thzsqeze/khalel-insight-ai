import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import publicRu from "@/messages/public-ru.json";
import publicKk from "@/messages/public-kk.json";
import adminRu from "@/messages/admin-ru.json";
import adminKk from "@/messages/admin-kk.json";
import { getOrganization } from "@/lib/server/organization";
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "kk" ? "kk" : "ru";
  const messages = locale === "kk" ? { ...publicKk, ...adminKk } : { ...publicRu, ...adminRu };
  return { locale, timeZone: "Asia/Atyrau", messages: { ...messages, organization: getOrganization(locale) } };
});
