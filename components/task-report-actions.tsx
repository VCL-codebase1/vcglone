"use client";

import { Download, FileText } from "lucide-react";
import Link from "next/link";

export function TaskReportActions({ csvHref, pdfHref }: { csvHref: string; pdfHref: string }) {
  return <div className="flex flex-col gap-2 sm:flex-row print:hidden"><Link href={csvHref} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-soft dark:bg-panel"><Download className="h-4 w-4" />Export CSV</Link><Link href={pdfHref} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-soft"><FileText className="h-4 w-4" />Export PDF</Link></div>;
}
