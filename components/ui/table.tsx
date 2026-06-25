"use client";

import type { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-[0_16px_50px_rgba(23,32,51,0.07)] ring-1 ring-line/70">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] divide-y divide-line text-sm">{children}</table>
      </div>
    </div>
  );
}
