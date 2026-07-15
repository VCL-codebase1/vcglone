"use client";

import { Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const REFRESH_INTERVAL_MS = 10_000;

export function AttendanceLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    const timer = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  return (
    <div
      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 sm:w-auto dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
      title="Attendance refreshes automatically every 10 seconds"
    >
      <Radio className="h-4 w-4" aria-hidden />
      <span>Live attendance</span>
    </div>
  );
}
