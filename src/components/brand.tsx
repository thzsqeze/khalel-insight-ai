import Image from "next/image";
import { cn } from "@/lib/utils";

export function Brand({ inverse = false, className }: { inverse?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 text-[#242722]",
        inverse && "text-white",
        className,
      )}
    >
      <Image
        src="/brand/univoice-mark.svg"
        width={484}
        height={330}
        alt=""
        aria-hidden="true"
        unoptimized
        loading="eager"
        className="h-auto w-12 shrink-0"
      />
      <span className="text-[23px] font-semibold leading-none tracking-[-1.15px]">
        UniVoice
        <span className="ml-0.5 text-primary" aria-hidden="true">
          .
        </span>
      </span>
    </span>
  );
}
