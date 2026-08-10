"use client";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface p-6 text-center dark:bg-panel sm:p-8">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}
