"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";
export default function ErrorPage({ reset }: { reset: () => void }) { const t = useTranslations("system"); return <main className="flex min-h-[70vh] flex-col items-center justify-center gap-5 p-6 text-center"><TriangleAlert className="size-10 text-amber-500" /><h1 className="text-2xl font-semibold">{t("errorTitle")}</h1><p className="max-w-md text-muted-foreground">{t("errorBody")}</p><Button onClick={reset}>{t("retry")}</Button></main>; }
