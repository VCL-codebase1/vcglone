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
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/35" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 z-50 flex w-[min(24rem,calc(100vw-1rem))] flex-col overflow-y-auto border-line bg-[#f8fbfe] p-5 shadow-[0_24px_70px_rgba(31,45,89,0.16)] outline-none",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          className
        )}
      >
        {title ? <DialogPrimitive.Title className="mb-4 text-lg font-semibold text-ink">{title}</DialogPrimitive.Title> : null}
        <DialogPrimitive.Close className="focus-ring absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-muted shadow-sm transition hover:bg-brandSoft hover:text-brand">
          <X className="h-4 w-4" aria-hidden />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
