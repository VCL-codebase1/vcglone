"use client";

import type { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_10px_30px_rgba(31,45,89,0.07)] ring-1 ring-line/70">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] divide-y divide-line text-sm">{children}</table>
      </div>
    </div>
  );
}
