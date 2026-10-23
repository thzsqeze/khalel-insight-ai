import * as React from "react";
import { cn } from "@/lib/utils";
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) { return <textarea ref={ref} className={cn("flex min-h-28 w-full rounded-md border border-border bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary disabled:opacity-50", className)} {...props} />; });
