"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CampusModel } from "./campus-model";

const topics = ["education", "infrastructure", "communication"] as const;
type CampusTopic = (typeof topics)[number];
const orbits: Record<CampusTopic, string> = {
  education: "145deg 65deg 105%",
  infrastructure: "215deg 65deg 105%",
  communication: "75deg 65deg 105%",
};

export function CampusExplorer() {
  const t = useTranslations("landing.campus");
  const [topic, setTopic] = useState<CampusTopic>("education");

  return (
    <section
      aria-labelledby="campus-explorer-title"
      className="relative overflow-hidden rounded-[28px] border border-[#d7dfca] bg-[#e9eddf] p-5 sm:p-7"
    >
      <div className="relative z-10">
        <p className="text-[10px] font-semibold leading-5 tracking-[1.3px] text-[#637456]">
          {t("eyebrow")}
        </p>
        <h2
          id="campus-explorer-title"
          className="mt-2 max-w-[340px] text-[28px] font-medium leading-[1.2] tracking-[-.8px] text-[#293f33] sm:text-[31px]"
        >
          {t("title")}
        </h2>
        <p className="mt-2 text-xs leading-5 text-[#65745b]">{t("description")}</p>
      </div>
      <CampusModel orbit={orbits[topic]} />
      <div className="relative z-10">
        <div
          role="group"
          aria-label={t("chooseTopic")}
          className="grid grid-cols-3 gap-1.5 rounded-full border border-[#d2dcc3] bg-[#dce5cf] p-1"
        >
          {topics.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={topic === item}
              onClick={() => setTopic(item)}
              className={cn(
                "min-h-11 rounded-full px-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                topic === item
                  ? "bg-[#293f33] text-[#f6f5f1] shadow-sm"
                  : "text-[#56694a] hover:bg-[#edf2e5] hover:text-[#293f33]",
              )}
            >
              {t(`topics.${item}.label`)}
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-[#fffefa]/80 px-4 py-4 sm:px-5">
          <p aria-live="polite" className="min-h-[42px] text-xs leading-[1.8] text-[#63705b]">
            {t(`topics.${topic}.description`)}
          </p>
          <Link
            href={`/submit?category=${topic}`}
            className="mt-3 flex min-h-11 items-center justify-between gap-4 border-t border-[#dce2d3] pt-3 text-xs font-semibold text-[#315747] hover:text-[#1d382b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            {t("openTopic")}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
      <a
        href="https://kenney.nl/assets/city-kit-commercial"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex min-h-6 items-center text-[10px] text-[#65745b] underline decoration-[#b9c6ab] underline-offset-4 hover:text-primary"
      >
        {t("credit")}
      </a>
    </section>
  );
}
