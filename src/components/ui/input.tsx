import * as React from "react";
import { cn } from "@/lib/utils";
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, type, ...props }, ref) { return <input ref={ref} type={type} className={cn("flex h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary disabled:opacity-50", className)} {...props} />; });
