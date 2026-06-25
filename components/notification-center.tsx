import { Bell, Check, CheckCheck } from "lucide-react";
import Link from "next/link";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions";
import { formatDateTime } from "@/lib/dates";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export function NotificationCenter({ notifications, unreadCount }: { notifications: NotificationItem[]; unreadCount: number }) {
  return (
    <section className="rounded-2xl border border-white/70 bg-white/90 p-3 shadow-[0_12px_32px_rgba(23,32,51,0.06)] ring-1 ring-line/70">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brandSoft text-brand">
            <Bell className="h-4 w-4" aria-hidden />
            {unreadCount ? <span className="absolute -right-1 -top-1 rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{unreadCount}</span> : null}
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Notifications</p>
            <p className="text-xs text-muted">{unreadCount ? `${unreadCount} unread` : "All caught up"}</p>
          </div>
        </div>
        {unreadCount ? (
          <form action={markAllNotificationsRead}>
            <button type="submit" className="focus-ring rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brandSoft">
              <CheckCheck className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Read
            </button>
          </form>
        ) : null}
      </div>
      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
        {notifications.length ? notifications.map((notification) => {
          const content = (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{notification.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted">{notification.message}</p>
              <p className="mt-1 text-[11px] font-medium text-muted">{formatDateTime(notification.createdAt)}</p>
            </div>
          );

          return (
            <div key={notification.id} className="flex gap-2 rounded-xl border border-line/70 bg-surface/70 p-3">
              <span className={notification.readAt ? "mt-1 h-2 w-2 rounded-full bg-line" : "mt-1 h-2 w-2 rounded-full bg-brand"} />
              {notification.href ? <Link href={notification.href} className="min-w-0 flex-1 hover:underline">{content}</Link> : content}
              {!notification.readAt ? (
                <form action={markNotificationRead}>
                  <input type="hidden" name="id" value={notification.id} />
                  <button type="submit" className="focus-ring rounded-md p-1.5 text-muted hover:bg-white hover:text-brand" aria-label="Mark notification read">
                    <Check className="h-4 w-4" aria-hidden />
                  </button>
                </form>
              ) : null}
            </div>
          );
        }) : (
          <div className="rounded-xl border border-dashed border-line bg-surface/70 p-4 text-center">
            <p className="text-sm font-semibold text-ink">No notifications yet</p>
            <p className="mt-1 text-xs text-muted">Approvals, profile events, and account updates will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
}
