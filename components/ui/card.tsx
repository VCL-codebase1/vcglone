"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("min-w-0 rounded-xl border border-line bg-white p-4 shadow-sm dark:bg-panel sm:p-5", className)}>{children}</section>;
}
