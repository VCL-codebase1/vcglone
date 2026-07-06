"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  children,
  className,
  side = "right",
  title
}: {
  children: ReactNode;
  className?: string;
  side?: "left" | "right";
  title?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col overflow-y-auto border-line bg-white p-4 shadow-[0_24px_80px_rgba(23,32,51,0.16)] outline-none dark:bg-panel dark:shadow-none",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          className
        )}
      >
        {title ? <DialogPrimitive.Title className="mb-4 text-lg font-semibold text-ink">{title}</DialogPrimitive.Title> : null}
        <DialogPrimitive.Close className="focus-ring absolute right-3 top-3 rounded-md p-1 text-muted hover:text-ink">
          <X className="h-4 w-4" aria-hidden />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
