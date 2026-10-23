import { getTranslations } from "next-intl/server";
export default async function Loading() { const t = await getTranslations("system"); return <div className="flex min-h-[65vh] items-center justify-center" role="status" aria-label={t("loading")}><div className="size-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" /></div>; }
