"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "@/lib/toast";

export type ChatNotificationStatus = {
  unreadCount: number;
  latest: {
    id: string;
    title: string;
    message: string;
    href: string;
    createdAt: string;
  } | null;
};

async function fetchChatNotificationStatus() {
  const response = await fetch("/api/chat/status", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to refresh chat notifications.");
  return response.json() as Promise<ChatNotificationStatus>;
}

export function LiveChatNotification({
  href,
  initialStatus,
  className,
  announce = false
}: {
  href: string;
  initialStatus: ChatNotificationStatus;
  className: string;
  announce?: boolean;
}) {
  const router = useRouter();
  const latestId = useRef(initialStatus.latest?.id || null);
  const statusQuery = useQuery({
    queryKey: ["chat-notification-status"],
    queryFn: fetchChatNotificationStatus,
    initialData: initialStatus,
    refetchInterval: 5_000,
    refetchIntervalInBackground: true
  });
  const status = statusQuery.data || initialStatus;

  useEffect(() => {
    if (!announce) return;
    const latest = status.latest;
    if (!latest || latest.id === latestId.current) return;
    latestId.current = latest.id;
    toast.info(latest.title, {
      description: latest.message,
      action: { label: "Reply", onClick: () => router.push(latest.href) }
    });
  }, [announce, router, status]);

  const destination = status.latest?.href || href;
  return (
    <Link href={destination} className={className} aria-label={status.unreadCount ? `Open chat, ${status.unreadCount} unread messages` : "Open chat"} title="Chat">
      <MessageCircle className="h-4 w-4" aria-hidden />
      {status.unreadCount ? <span className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{status.unreadCount > 99 ? "99+" : status.unreadCount}</span> : null}
    </Link>
  );
}
