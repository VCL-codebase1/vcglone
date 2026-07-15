"use client";

import { cn } from "@/lib/utils";

export function StatusBadge({ value }: { value: string }) {
  const normalized = value.replace(/_/g, " ");
  const statusKey = value.toUpperCase();
  const color =
    statusKey.includes("APPROVED") || statusKey.includes("COMPLETED") || statusKey.includes("CHECKED_OUT") || statusKey.includes("PRESENT")
      ? "bg-emerald-50 text-success ring-emerald-200 dark:bg-emerald-950/40 dark:ring-emerald-800"
      : statusKey.includes("LEAVE")
        ? "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-800"
      : statusKey.includes("OVERDUE") || statusKey.includes("BLOCKED") || statusKey.includes("CHANGES_REQUESTED")
        ? "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800"
      : statusKey.includes("IN_PROGRESS") || statusKey.includes("ASSIGNED")
        ? "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-800"
      : statusKey.includes("PENDING") || statusKey.includes("REVIEW") || statusKey.includes("CHECKED_IN")
        ? "bg-amber-50 text-warning ring-amber-200 dark:bg-amber-950/40 dark:ring-amber-800"
        : statusKey.includes("REJECTED") || statusKey.includes("ABSENT")
          ? "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800"
          : "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700";
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1", color)}>{normalized}</span>;
}
