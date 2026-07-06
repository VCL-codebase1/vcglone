"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 max-[420px]:w-full",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white shadow-[0_10px_24px_rgba(16,43,116,0.18)] hover:-translate-y-0.5 hover:bg-[#0b1f56] hover:shadow-[0_14px_28px_rgba(16,43,116,0.22)]",
        secondary: "border border-line bg-white text-ink shadow-[0_8px_20px_rgba(23,32,51,0.04)] hover:-translate-y-0.5 hover:bg-surface dark:bg-panel dark:shadow-none",
        danger: "bg-amber-700 text-white shadow-[0_10px_24px_rgba(180,83,9,0.16)] hover:-translate-y-0.5 hover:bg-amber-800",
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
  return <Comp className={cn(buttonVariants({ variant }), className)} {...props} />;
}

export function LinkButton({
  className,
  variant = "primary",
  ...props
}: ComponentProps<typeof Link> & { variant?: "primary" | "secondary" }) {
  return (
    <Link
      className={cn(
        "focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 max-[420px]:w-full",
        variant === "primary" && "bg-brand text-white shadow-[0_10px_24px_rgba(16,43,116,0.18)] hover:-translate-y-0.5 hover:bg-[#0b1f56]",
        variant === "secondary" && "border border-line bg-white text-ink shadow-[0_8px_20px_rgba(23,32,51,0.04)] hover:-translate-y-0.5 hover:bg-surface dark:bg-panel dark:shadow-none",
        className
      )}
      {...props}
    />
  );
}
