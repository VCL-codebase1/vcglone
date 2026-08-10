"use client";

import type { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-line bg-white shadow-sm dark:bg-panel">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] divide-y divide-line text-sm">{children}</table>
      </div>
    </div>
  );
}
