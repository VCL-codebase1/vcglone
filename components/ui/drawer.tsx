"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;

export function DrawerContent({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border border-line bg-white p-4 shadow-[0_-18px_60px_rgba(23,32,51,0.14)] outline-none",
          className
        )}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        {title ? <DialogPrimitive.Title className="mb-4 text-lg font-semibold text-ink">{title}</DialogPrimitive.Title> : null}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
