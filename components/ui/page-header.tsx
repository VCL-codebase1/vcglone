"use client";

import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="break-words text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl break-words text-sm text-muted">{description}</p> : null}
      </div>
      {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
    </div>
  );
}
