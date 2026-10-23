import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
const kazakhMonths = ["қаң.", "ақп.", "нау.", "сәу.", "мам.", "мау.", "шіл.", "там.", "қыр.", "қаз.", "қар.", "жел."];
export function formatDate(value: string, locale: string = "ru") {
  const date = new Date(value);
  if (locale === "kk") {
    // Some WebKit ICU builds return placeholder month names (M10) for kk-KZ.
    const parts = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "numeric", timeZone: "Asia/Atyrau" }).formatToParts(date);
    const day = parts.find(part => part.type === "day")!.value;
    const month = Number(parts.find(part => part.type === "month")!.value);
    return `${Number(day)} ${kazakhMonths[month - 1]}`;
  }
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "Asia/Atyrau" }).format(date);
}
