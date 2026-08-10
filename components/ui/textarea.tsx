"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentPropsWithoutRef<"textarea">>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={cn(
        "focus-ring block w-full max-w-full min-w-0 rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-400 transition focus:border-brand/60 dark:bg-panel dark:placeholder:text-slate-500",
        className
      )}
    />
  );
});
