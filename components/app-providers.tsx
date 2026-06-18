"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { Toaster } from "sonner";
import { Button } from "@/components/ui";

function AppFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = error instanceof Error ? error.message : "The app could not finish this request.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <section className="w-full max-w-lg rounded-lg border border-line bg-white p-6 shadow-soft">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-red-50 p-2 text-danger">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-ink">Something went wrong</h1>
            <p className="mt-2 break-words text-sm text-muted">{message}</p>
            <Button type="button" className="mt-4" onClick={resetErrorBoundary}>
              Try again
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1
          }
        }
      })
  );

  return (
    <ErrorBoundary FallbackComponent={AppFallback}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors closeButton position="top-right" />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
