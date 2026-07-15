"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type DashboardMetric = {
  label: string;
  value: number | string;
  detail?: string;
  href?: string;
  attention?: boolean;
};

export function DashboardMetricStrip({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <Card className="overflow-hidden p-0 sm:p-0">
      <div className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const content = (
            <>
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{metric.label}</p>
                {metric.href ? <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition group-hover:text-brand" aria-hidden /> : null}
              </div>
              <p className={cn("mt-2 text-2xl font-semibold tracking-tight text-ink", metric.attention && "text-warning")}>{metric.value}</p>
              {metric.detail ? <p className="mt-1 text-xs text-muted">{metric.detail}</p> : null}
            </>
          );
          const className = "group block min-h-24 bg-white p-4 text-left transition hover:bg-surface sm:p-5 dark:bg-panel";

          return metric.href
            ? <Link key={metric.label} href={metric.href} className={className}>{content}</Link>
            : <div key={metric.label} className={className}>{content}</div>;
        })}
      </div>
    </Card>
  );
}

export function DashboardSectionHeader({
  title,
  description,
  href,
  linkLabel = "View all"
}: {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex min-w-0 items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="focus-ring shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-brand transition hover:bg-brandSoft">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}
