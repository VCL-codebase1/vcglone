"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentPropsWithoutRef<"textarea">>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={cn(
        "focus-ring block w-full max-w-full min-w-0 rounded-2xl border border-transparent bg-surface px-4 py-3 text-sm text-ink placeholder:text-slate-400 transition focus:border-brand/30 focus:bg-white",
        className
      )}
    />
  );
});
