"use client";

import type { ReactNode } from "react";
export function StatCard({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <div className="min-w-0 border-l border-line px-4 py-2 first:border-l-0 first:pl-0 sm:px-5">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 break-words text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {detail ? <p className="mt-0.5 text-xs text-muted">{detail}</p> : null}
    </div>
  );
}
