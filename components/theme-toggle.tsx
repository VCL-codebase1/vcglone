"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = theme === "dark";
  const Icon = isDark ? Sun : Moon;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      type="button"
      className={cn(
        "focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-brand shadow-[0_8px_20px_rgba(23,32,51,0.04)] transition hover:-translate-y-0.5 hover:bg-surface dark:bg-panel dark:text-blue-200 dark:shadow-none",
        className
      )}
      aria-label={mounted ? `Switch to ${isDark ? "light" : "dark"} mode` : "Toggle color mode"}
      title={mounted ? `Switch to ${isDark ? "light" : "dark"} mode` : "Toggle color mode"}
      onClick={toggleTheme}
    >
      {mounted ? <Icon className="h-4 w-4" aria-hidden /> : <span className="h-4 w-4" />}
    </button>
  );
}
