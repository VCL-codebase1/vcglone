"use client";

import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <section className="w-full max-w-lg rounded-lg border border-line bg-white p-6 shadow-soft">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-red-50 p-2 text-danger">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-ink">We could not load this page</h1>
            <p className="mt-2 text-sm text-muted">The error has been captured for review. Try again when you are ready.</p>
            <Button type="button" className="mt-4" onClick={reset}>
              Try again
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
