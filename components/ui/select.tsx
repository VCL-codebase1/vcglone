"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, ComponentPropsWithoutRef<"select">>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      {...props}
      className={cn(
        "focus-ring block min-h-11 w-full max-w-full min-w-0 rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink transition focus:border-brand/60 dark:bg-panel",
        className
      )}
    />
  );
});
