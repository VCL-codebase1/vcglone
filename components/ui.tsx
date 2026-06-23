"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import Link from "next/link";
import { forwardRef, type ComponentProps, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("min-w-0 rounded-lg border border-line bg-white p-4 shadow-soft sm:p-5", className)}>{children}</section>;
}

export function PageHeader({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="break-words text-xl font-semibold tracking-normal text-ink sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl break-words text-sm text-muted">{description}</p> : null}
      </div>
      {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
    </div>
  );
}

const buttonVariants = cva(
  "focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 max-[420px]:w-full",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white hover:bg-[#0b1f56]",
        secondary: "border border-line bg-white text-ink hover:bg-surface",
        danger: "bg-danger text-white hover:bg-red-800",
        ghost: "text-ink hover:bg-surface"
      }
    },
    defaultVariants: {
      variant: "primary"
    }
  }
);

export function Button({
  className,
  variant,
  asChild = false,
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  );
}

export function LinkButton({
  className,
  variant = "primary",
  ...props
}: ComponentProps<typeof Link> & { variant?: "primary" | "secondary" }) {
  return (
    <Link
      className={cn(
        "focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition max-[420px]:w-full",
        variant === "primary" && "bg-brand text-white hover:bg-[#0b1f56]",
        variant === "secondary" && "border border-line bg-white text-ink hover:bg-surface",
        className
      )}
      {...props}
    />
  );
}

export const Input = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      {...props}
      className={cn(
        "focus-ring w-full min-w-0 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400",
        className
      )}
    />
  );
});

export function Select(props: ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={cn("focus-ring w-full min-w-0 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink", props.className)}
    />
  );
}

export function Textarea(props: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={cn(
        "focus-ring w-full min-w-0 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400",
        props.className
      )}
    />
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block min-w-0 space-y-1.5 text-sm font-medium text-ink">
      <span>{label}</span>
      {children}
      {hint ? <span className="block text-xs font-normal text-muted">{hint}</span> : null}
    </label>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const normalized = value.replace(/_/g, " ");
  const color =
    value.includes("APPROVED") || value.includes("CHECKED_OUT") || value.includes("PRESENT")
      ? "bg-emerald-50 text-success ring-emerald-200"
      : value.includes("PENDING") || value.includes("REVIEW") || value.includes("CHECKED_IN")
        ? "bg-amber-50 text-warning ring-amber-200"
        : value.includes("REJECTED") || value.includes("ABSENT")
          ? "bg-red-50 text-danger ring-red-200"
          : "bg-slate-100 text-slate-700 ring-slate-200";
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1", color)}>{normalized}</span>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white p-6 text-center sm:p-8">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}

export function StatCard({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 break-words text-2xl font-semibold text-ink sm:text-3xl">{value}</p>
      {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
    </Card>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-lg border border-line bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] divide-y divide-line text-sm">{children}</table>
      </div>
    </div>
  );
}

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  children,
  className,
  title,
  description
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-line bg-white p-5 shadow-soft outline-none",
          className
        )}
      >
        {title ? <DialogPrimitive.Title className="text-lg font-semibold text-ink">{title}</DialogPrimitive.Title> : null}
        {description ? <DialogPrimitive.Description className="mt-1 text-sm text-muted">{description}</DialogPrimitive.Description> : null}
        <DialogPrimitive.Close className="focus-ring absolute right-3 top-3 rounded-md p-1 text-muted hover:text-ink">
          <X className="h-4 w-4" aria-hidden />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
        <div className={cn(title || description ? "mt-4" : "")}>{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

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
          "fixed inset-y-0 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col overflow-y-auto border-line bg-white p-4 shadow-soft outline-none",
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

export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;

export function DrawerContent({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-lg border border-line bg-white p-4 shadow-soft outline-none",
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

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200", className)} />;
}
