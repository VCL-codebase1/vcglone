"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("min-w-0 rounded-2xl border border-white/80 bg-white p-4 shadow-[0_10px_30px_rgba(31,45,89,0.07)] ring-1 ring-line/70 sm:p-5", className)}>{children}</section>;
}
