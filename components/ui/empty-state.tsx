"use client";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface/40 px-4 py-8 text-center">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}
