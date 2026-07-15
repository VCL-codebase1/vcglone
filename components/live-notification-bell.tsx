"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "@/lib/toast";

export type NotificationStatus = {
  unreadCount: number;
  latest: {
    id: string;
    title: string;
    message: string;
    href: string | null;
    createdAt: string;
  } | null;
};

async function fetchNotificationStatus() {
  const response = await fetch("/api/notifications/status", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to refresh notifications.");
  return response.json() as Promise<NotificationStatus>;
}

export function LiveNotificationBell({
  href,
  initialStatus,
  className,
  announce = false
}: {
  href: string;
  initialStatus: NotificationStatus;
  className: string;
  announce?: boolean;
}) {
  const router = useRouter();
  const latestId = useRef(initialStatus.latest?.id || null);
  const statusQuery = useQuery({
    queryKey: ["notification-status"],
    queryFn: fetchNotificationStatus,
    initialData: initialStatus,
    refetchInterval: 5_000,
    refetchIntervalInBackground: true
  });
  const status = statusQuery.data || initialStatus;

  useEffect(() => {
    if (!announce) return;
    const badgeNavigator = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (status.unreadCount > 0) badgeNavigator.setAppBadge?.(status.unreadCount).catch(() => undefined);
    else badgeNavigator.clearAppBadge?.().catch(() => undefined);

    const latest = status.latest;
    if (!latest || latest.id === latestId.current) return;
    latestId.current = latest.id;
    toast.info(latest.title, {
      description: latest.message,
      action: latest.href ? { label: "Open", onClick: () => router.push(latest.href!) } : undefined
    });
  }, [announce, router, status]);

  return (
    <Link href={href} className={className} aria-label={status.unreadCount ? `Open notifications, ${status.unreadCount} unread` : "Open notifications"}>
      <Bell className="h-4 w-4" aria-hidden />
      {status.unreadCount ? <span className="absolute -right-1 -top-1 rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{status.unreadCount > 99 ? "99+" : status.unreadCount}</span> : null}
    </Link>
  );
}
