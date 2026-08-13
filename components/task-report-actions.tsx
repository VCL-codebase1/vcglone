"use client";

import { ChevronDown, Download, FileText } from "lucide-react";
import Link from "next/link";

export function TaskReportActions({ csvHref, pdfHref, delegationCsvHref }: { csvHref: string; pdfHref: string; delegationCsvHref?: string }) {
  return (
    <details className="group relative print:hidden">
      <summary className="focus-ring flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface [&::-webkit-details-marker]:hidden">
        <Download className="h-4 w-4" /> Download <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-lg border border-line bg-white p-1.5 shadow-[0_14px_36px_rgba(23,32,51,0.14)]">
        <Link href={csvHref} className="flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-ink hover:bg-surface"><Download className="h-4 w-4 text-muted" />Tasks CSV</Link>
        {delegationCsvHref ? <Link href={delegationCsvHref} className="flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-ink hover:bg-surface"><Download className="h-4 w-4 text-muted" />Handoffs CSV</Link> : null}
        <Link href={pdfHref} className="flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-ink hover:bg-surface"><FileText className="h-4 w-4 text-muted" />PDF report</Link>
      </div>
    </details>
  );
}
