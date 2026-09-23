"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("min-w-0 rounded-3xl border border-white bg-white p-5 shadow-[0_4px_24px_rgba(17,25,79,0.025)] sm:p-6", className)}>{children}</section>;
}
