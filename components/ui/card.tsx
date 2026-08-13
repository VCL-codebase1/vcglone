"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("min-w-0 border-y border-line bg-white py-4 sm:py-5", className)}>{children}</section>;
}
