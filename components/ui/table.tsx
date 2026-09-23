"use client";

import type { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-line/70 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] divide-y divide-line text-sm leading-5">{children}</table>
      </div>
    </div>
  );
}
