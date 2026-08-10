import { EmploymentStatus, Role } from "@prisma/client";
import { dateOnlyInTimeZone } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push-notifications";
import { roleAttendance } from "@/lib/routes";

type ReminderPolicy = {
  workEndTime: string;
  timezone: string;
  workingDays: string[];
  checkOutReminderEnabled: boolean;
};

const DEFAULT_POLICY: ReminderPolicy = {
  workEndTime: "17:00",
  timezone: "Africa/Lagos",
  workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
  checkOutReminderEnabled: true
};

function normalizedPolicy(policy: ReminderPolicy): ReminderPolicy {
  const validTime = /^([01]\d|2[0-3]):([0-5]\d)$/.test(policy.workEndTime);
  let validTimeZone = true;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: policy.timezone }).format();
  } catch {
    validTimeZone = false;
  }
  return {
    ...policy,
    workEndTime: validTime ? policy.workEndTime : DEFAULT_POLICY.workEndTime,
    timezone: validTimeZone ? policy.timezone : DEFAULT_POLICY.timezone,
    workingDays: policy.workingDays.length ? policy.workingDays : DEFAULT_POLICY.workingDays
  };
}

function timeMinutes(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) throw new Error(`Invalid work end time: ${value}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  return {
    weekday: parts.find((part) => part.type === "weekday")?.value.toUpperCase() || "",
    hour: Number(parts.find((part) => part.type === "hour")?.value),
    minute: Number(parts.find((part) => part.type === "minute")?.value)
  };
}

function timeLabel(value: string) {
  const minutes = timeMinutes(value);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function checkoutReminderWindow(policy: ReminderPolicy, now = new Date()) {
  const parts = localParts(now, policy.timezone);
  const workingDay = policy.workingDays.includes(parts.weekday);
  const due = policy.checkOutReminderEnabled
    && workingDay
    && parts.hour * 60 + parts.minute >= timeMinutes(policy.workEndTime);
  return {
    due,
    date: dateOnlyInTimeZone(now, policy.timezone),
    workEndLabel: timeLabel(policy.workEndTime)
  };
}

export async function sendCheckoutReminders(options: { now?: Date; userId?: string; limit?: number } = {}) {
  const now = options.now || new Date();
  const configuredPolicy = await prisma.workPolicy.findFirst({
    select: {
      workEndTime: true,
      timezone: true,
      workingDays: true,
      checkOutReminderEnabled: true
    }
  });
  const policy = normalizedPolicy(configuredPolicy || DEFAULT_POLICY);
  const window = checkoutReminderWindow(policy, now);
  if (!window.due) return { due: false, candidates: 0, sent: 0, pushFailures: 0 };

  const records = await prisma.attendanceRecord.findMany({
    where: {
      date: window.date,
      checkInTime: { not: null },
      checkOutTime: null,
      checkOutReminderSentAt: null,
      ...(options.userId ? { employeeId: options.userId } : {}),
      employee: {
        employmentStatus: EmploymentStatus.ACTIVE,
        role: { not: Role.SUPER_ADMIN }
      }
    },
    select: {
      id: true,
      employeeId: true,
      employee: { select: { role: true } }
    },
    orderBy: { checkInTime: "asc" },
    take: options.limit || 100
  });

  let sent = 0;
  let pushFailures = 0;
  for (const record of records) {
    const notification = await prisma.$transaction(async (tx) => {
      const claimed = await tx.attendanceRecord.updateMany({
        where: {
          id: record.id,
          checkOutTime: null,
          checkOutReminderSentAt: null
        },
        data: { checkOutReminderSentAt: now }
      });
      if (!claimed.count) return null;
      return tx.notification.create({
        data: {
          userId: record.employeeId,
          title: "Time to check out",
          message: `Your scheduled workday ended at ${window.workEndLabel}. Please check out now to complete today's attendance record.`,
          href: roleAttendance(record.employee.role)
        }
      });
    });
    if (!notification) continue;
    sent += 1;
    try {
      await sendPushToUser(record.employeeId, {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        href: notification.href
      });
    } catch {
      pushFailures += 1;
    }
  }

  return { due: true, candidates: records.length, sent, pushFailures };
}

export async function ensureCheckoutReminderForUser(userId: string) {
  return sendCheckoutReminders({ userId, limit: 1 });
}
