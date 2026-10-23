import { cn } from "@/lib/utils";
export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select className={cn("h-10 max-w-full rounded-lg border border-border bg-white px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30", className)} {...props} />; }
