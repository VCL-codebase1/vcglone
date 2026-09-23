"use client";

import type { ReactNode } from "react";
export function StatCard({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <div className="min-w-0 rounded-3xl bg-white px-5 py-5 sm:px-6">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-3 break-words text-4xl font-medium tracking-tight text-ink">{value}</p>
      {detail ? <p className="mt-0.5 text-xs text-muted">{detail}</p> : null}
    </div>
  );
}
