"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  children,
  className,
  title,
  description,
  visuallyHiddenHeader = false
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  visuallyHiddenHeader?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="app-dialog-overlay fixed inset-0 z-50 bg-ink/35" />
      <DialogPrimitive.Content
        className={cn(
          "app-dialog-content fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[1.75rem] border border-white bg-white p-5 shadow-[0_24px_70px_rgba(31,45,89,0.16)] ring-1 ring-line outline-none sm:p-6",
          className
        )}
      >
        {title ? <DialogPrimitive.Title className={visuallyHiddenHeader ? "sr-only" : "text-lg font-semibold text-ink"}>{title}</DialogPrimitive.Title> : null}
        {description ? <DialogPrimitive.Description className={visuallyHiddenHeader ? "sr-only" : "mt-1 text-sm text-muted"}>{description}</DialogPrimitive.Description> : null}
        <DialogPrimitive.Close className="focus-ring absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-muted transition hover:bg-brandSoft hover:text-brand">
          <X className="h-4 w-4" aria-hidden />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
        <div className={cn((title || description) && !visuallyHiddenHeader ? "mt-4" : "")}>{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
