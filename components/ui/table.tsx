"use client";

import type { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="w-full min-w-0 overflow-hidden border-y border-line bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] divide-y divide-line text-sm leading-5">{children}</table>
      </div>
    </div>
  );
}
