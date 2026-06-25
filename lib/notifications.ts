import { prisma } from "@/lib/prisma";

type NotificationInput = {
  userId: string;
  title: string;
  message: string;
  href?: string;
};

export async function createNotification({ userId, title, message, href }: NotificationInput) {
  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      href
    }
  });
}

export async function getRecentNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 12
  });
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
