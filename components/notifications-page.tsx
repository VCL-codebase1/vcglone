import { NotificationCenter } from "@/components/notification-center";
import { PageHeader } from "@/components/ui";
import { getRecentNotifications, getUnreadNotificationCount } from "@/lib/notifications";
import { requireUser } from "@/lib/rbac";

export async function NotificationsPage() {
  const user = await requireUser();
  const [notifications, unreadCount] = await Promise.all([
    getRecentNotifications(user.id),
    getUnreadNotificationCount(user.id)
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Notifications" description="Review account updates, approvals, attendance events, and completed actions." />
      <NotificationCenter notifications={notifications} unreadCount={unreadCount} />
    </div>
  );
}
