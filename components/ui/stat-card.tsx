"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function StatCard({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="p-4 sm:p-5">
        <p className="text-sm font-medium text-muted">{label}</p>
        <p className="mt-2 break-words text-2xl font-semibold text-ink sm:text-3xl">{value}</p>
        {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
      </div>
    </Card>
  );
}
