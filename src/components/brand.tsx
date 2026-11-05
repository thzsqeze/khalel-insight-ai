import Image from "next/image";
import { cn } from "@/lib/utils";

export function Brand({
  inverse = false,
  compact = false,
  className,
}: {
  inverse?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-[#242722]",
        !compact && "sm:gap-2.5",
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
        className={cn("h-auto shrink-0", compact ? "w-8" : "w-10 sm:w-12")}
      />
      <span
        className={cn(
          "text-[20px] font-semibold leading-none tracking-[-1.15px]",
          !compact && "sm:text-[23px]",
        )}
      >
        UniVoice AI
        <span className="ml-0.5 text-primary" aria-hidden="true">
          .
        </span>
      </span>
    </span>
  );
}
