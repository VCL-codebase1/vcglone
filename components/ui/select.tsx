"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, ComponentPropsWithoutRef<"select">>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      {...props}
      className={cn(
        "focus-ring block min-h-11 w-full max-w-full min-w-0 rounded-full border border-transparent bg-surface px-4 py-2.5 text-sm text-ink transition focus:border-brand/30 focus:bg-white",
        className
      )}
    />
  );
});
