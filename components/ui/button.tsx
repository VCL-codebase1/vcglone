"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 max-[420px]:w-full",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white hover:bg-[#0b1f56]",
        secondary: "border border-line bg-white text-ink hover:bg-surface dark:bg-panel",
        danger: "bg-amber-700 text-white hover:bg-amber-800",
        ghost: "text-ink hover:bg-surface"
      }
    },
    defaultVariants: {
      variant: "primary"
    }
  }
);

export const Button = forwardRef<HTMLButtonElement, ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }>(function Button({
  className,
  variant,
  asChild = false,
  ...props
}, ref) {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant }), className)} {...props} />;
});

export function LinkButton({
  className,
  variant = "primary",
  ...props
}: ComponentProps<typeof Link> & { variant?: "primary" | "secondary" }) {
  return (
    <Link
      className={cn(
        "focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition max-[420px]:w-full",
        variant === "primary" && "bg-brand text-white hover:bg-[#0b1f56]",
        variant === "secondary" && "border border-line bg-white text-ink hover:bg-surface dark:bg-panel",
        className
      )}
      {...props}
    />
  );
}
