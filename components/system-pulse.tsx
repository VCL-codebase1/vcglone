"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { Skeleton } from "@/components/ui";

type HealthPayload = {
  ok: boolean;
  app: string;
  timestamp: string;
};

export function SystemPulse() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["system-health"],
    queryFn: async () => {
      const response = await fetch("/api/health");
      if (!response.ok) throw new Error("Health check failed");
      return response.json() as Promise<HealthPayload>;
    },
    refetchInterval: 60_000
  });

  if (isLoading) return <Skeleton className="h-10 w-full sm:w-52" />;

  return (
    <div className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink shadow-soft sm:w-auto">
      <Activity className={isError ? "h-4 w-4 text-danger" : "h-4 w-4 text-success"} aria-hidden />
      <span>{isError ? "Service status unavailable" : `${data?.app || "vcglOne"} is available`}</span>
    </div>
  );
}
