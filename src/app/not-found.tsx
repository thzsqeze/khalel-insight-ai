import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
export default async function NotFound() { const t = await getTranslations("system"); return <main className="flex min-h-[70vh] flex-col items-center justify-center gap-5 p-6 text-center"><p className="text-6xl font-semibold text-primary">404</p><h1 className="text-xl font-semibold">{t("notFound")}</h1><Button asChild><Link href="/">{t("home")}</Link></Button></main>; }
