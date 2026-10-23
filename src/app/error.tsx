"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { captureClientError } from "@/lib/diagnostics/client";
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) { const t = useTranslations("system"); useEffect(() => { void captureClientError(error); }, [error]); return <main className="flex min-h-[70vh] flex-col items-center justify-center gap-5 p-6 text-center"><TriangleAlert className="size-10 text-amber-500" /><h1 className="text-2xl font-semibold">{t("errorTitle")}</h1><p className="max-w-md text-muted-foreground">{t("errorBody")}</p><Button onClick={retry}>{t("retry")}</Button></main>; }
