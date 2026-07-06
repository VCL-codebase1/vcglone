"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, ComponentPropsWithoutRef<"select">>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      {...props}
      className={cn(
        "focus-ring block min-h-11 w-full max-w-full min-w-0 rounded-xl border border-line bg-white/95 px-3.5 py-2.5 text-sm text-ink shadow-[0_6px_18px_rgba(23,32,51,0.03)] transition focus:border-brand/60 focus:bg-white",
        className
      )}
    />
  );
});
