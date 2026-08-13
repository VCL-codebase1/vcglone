import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MetricItem = {
  label: string;
  value: ReactNode;
  detail?: string;
  attention?: boolean;
};

export function PageToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("workspace-toolbar", className)}>{children}</div>;
}

export function MetricStrip({ items, className }: { items: MetricItem[]; className?: string }) {
  return (
    <dl className={cn("grid min-w-0 grid-cols-2 border-y border-line py-3 sm:grid-cols-4 xl:flex", className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0 border-l border-line px-4 py-2 first:border-l-0 first:pl-0 xl:flex-1 xl:px-5">
          <dt className="truncate text-xs font-medium text-muted">{item.label}</dt>
          <dd className={cn("mt-1 text-2xl font-semibold tracking-tight text-ink", item.attention && "text-warning")}>{item.value}</dd>
          {item.detail ? <p className="mt-0.5 truncate text-[11px] text-muted">{item.detail}</p> : null}
        </div>
      ))}
    </dl>
  );
}

export function WorkspaceSection({ title, description, action, children, className }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("workspace-section", className)}>
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-1 max-w-3xl text-sm leading-5 text-muted">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
