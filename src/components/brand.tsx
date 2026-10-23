import { cn } from "@/lib/utils";

export function Brand({ inverse = false, className }: { inverse?: boolean; className?: string }) {
  return <span className={cn("inline-flex items-center gap-2.5 text-[#242722]", inverse && "text-white", className)}>
    <svg width="29" height="32" viewBox="0 0 29 32" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M3 3v13a10 10 0 0 0 20 0V3" stroke="currentColor" strokeWidth="5" />
      <path d="M13 3v13" stroke="currentColor" strokeWidth="5" />
      <path d="m23 24 4 6" stroke="currentColor" strokeWidth="3" />
    </svg>
    <span className="text-[23px] font-semibold leading-none tracking-[-1.15px]">UniVoice<span className="ml-0.5 text-primary" aria-hidden="true">.</span></span>
  </span>;
}
