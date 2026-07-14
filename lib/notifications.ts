import type { Role } from "@prisma/client";
import { formatMonthDay, todayDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { roleHome } from "@/lib/routes";

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

function dateMatchesToday(date: Date | null, today: Date) {
  return Boolean(
    date
      && date.getUTCMonth() === today.getUTCMonth()
      && date.getUTCDate() === today.getUTCDate()
  );
}

function listNames(people: Array<{ firstName: string; lastName: string }>) {
  const names = people.map((person) => `${person.firstName} ${person.lastName}`);
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
}

export async function ensureBirthdayNotificationsForUser(user: { id: string; role: Role | string; firstName: string }) {
  const today = todayDateOnly();
  const duplicateWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const birthdays = (await prisma.user.findMany({
    where: { employmentStatus: "ACTIVE", dateOfBirth: { not: null }, role: { not: "SUPER_ADMIN" } },
    select: { id: true, firstName: true, lastName: true, dateOfBirth: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
  })).filter((person) => dateMatchesToday(person.dateOfBirth, today));

  if (!birthdays.length) return;

  const ownBirthday = birthdays.find((person) => person.id === user.id);
  const teammates = birthdays.filter((person) => person.id !== user.id);
  const title = ownBirthday ? `Happy birthday, ${user.firstName}` : "Today's birthdays";
  const message = ownBirthday
    ? teammates.length
      ? `Wishing you a wonderful birthday. Also celebrating ${listNames(teammates)} today.`
      : `Wishing you a wonderful birthday today, ${formatMonthDay(ownBirthday.dateOfBirth)}.`
    : `Celebrate ${listNames(birthdays)} today, ${formatMonthDay(birthdays[0]?.dateOfBirth)}.`;

  const existing = await prisma.notification.findFirst({
    where: {
      userId: user.id,
      title,
      createdAt: { gte: duplicateWindowStart }
    },
    select: { id: true }
  });

  if (existing) return;

  await createNotification({
    userId: user.id,
    title,
    message,
    href: roleHome(user.role)
  });
}
