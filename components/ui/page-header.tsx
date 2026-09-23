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
    <header className="flex min-w-0 flex-col gap-4 pb-2 pt-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="break-words text-3xl font-medium tracking-[-0.04em] text-ink sm:text-4xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-3xl break-words text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
    </header>
  );
}
