import { clsx } from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={clsx("rounded-lg border border-line bg-white p-5 shadow-soft", className)}>{children}</section>;
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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "danger" }) {
  return (
    <button
      className={clsx(
        "focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-brand text-white hover:bg-blue-700",
        variant === "secondary" && "border border-line bg-white text-ink hover:bg-surface",
        variant === "danger" && "bg-danger text-white hover:bg-red-800",
        className
      )}
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
      className={clsx(
        "focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition",
        variant === "primary" && "bg-brand text-white hover:bg-blue-700",
        variant === "secondary" && "border border-line bg-white text-ink hover:bg-surface",
        className
      )}
      {...props}
    />
  );
}

export function Input(props: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={clsx(
        "focus-ring w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400",
        props.className
      )}
    />
  );
}

export function Select(props: ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={clsx("focus-ring w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink", props.className)}
    />
  );
}

export function Textarea(props: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={clsx(
        "focus-ring w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400",
        props.className
      )}
    />
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-ink">
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
  return <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1", color)}>{normalized}</span>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}

export function StatCard({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
      {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
    </Card>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-soft"><table className="min-w-full divide-y divide-line text-sm">{children}</table></div>;
}
