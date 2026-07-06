"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("min-w-0 rounded-2xl border border-white/70 bg-white/95 p-4 shadow-[0_16px_50px_rgba(23,32,51,0.07)] ring-1 ring-line/70 backdrop-blur dark:border-line dark:bg-panel/95 dark:shadow-none sm:p-5", className)}>{children}</section>;
}
