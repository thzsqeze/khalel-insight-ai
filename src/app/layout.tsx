import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "@fontsource-variable/inter";
import "./globals.css";
export async function generateMetadata(): Promise<Metadata> { const t = await getTranslations("system"); return { title: { default: t("metaTitle"), template: "%s · UniVoice" }, description: t("metaDescription") }; }
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { const locale = await getLocale(); const messages = await getMessages(); return <html lang={locale} data-scroll-behavior="smooth"><body><NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider></body></html>; }
