"use client";

import { cn } from "@/lib/utils";

export function StatusBadge({ value }: { value: string }) {
  const normalized = value.replace(/_/g, " ");
  const color =
    value.includes("APPROVED") || value.includes("CHECKED_OUT") || value.includes("PRESENT")
      ? "bg-emerald-50 text-success ring-emerald-200 dark:bg-emerald-950/40 dark:ring-emerald-800"
      : value.includes("PENDING") || value.includes("REVIEW") || value.includes("CHECKED_IN")
        ? "bg-amber-50 text-warning ring-amber-200 dark:bg-amber-950/40 dark:ring-amber-800"
        : value.includes("REJECTED") || value.includes("ABSENT")
          ? "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800"
          : "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700";
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1", color)}>{normalized}</span>;
}
