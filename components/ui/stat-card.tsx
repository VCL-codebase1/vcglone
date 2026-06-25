"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function StatCard({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <Card className="group overflow-hidden p-0 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_54px_rgba(23,32,51,0.09)]">
      <div className="h-1 bg-gradient-to-r from-brand via-brand/60 to-emerald-500/60" />
      <div className="p-4">
        <p className="text-sm font-medium text-muted">{label}</p>
        <p className="mt-2 break-words text-2xl font-semibold text-ink sm:text-3xl">{value}</p>
        {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
      </div>
    </Card>
  );
}
