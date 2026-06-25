"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Textarea(props: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={cn(
        "focus-ring w-full min-w-0 rounded-xl border border-line bg-white/95 px-3.5 py-2.5 text-sm text-ink shadow-[0_6px_18px_rgba(23,32,51,0.03)] placeholder:text-slate-400 transition focus:border-brand/60 focus:bg-white",
        props.className
      )}
    />
  );
}
