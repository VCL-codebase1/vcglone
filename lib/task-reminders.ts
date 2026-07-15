import { Prisma, Role, TaskStatus } from "@prisma/client";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { taskHref } from "@/lib/tasks";

const OPEN_STATUSES = [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED, TaskStatus.IN_REVIEW, TaskStatus.CHANGES_REQUESTED];
const DAY = 24 * 60 * 60 * 1000;

function lagosDayKey(date: Date) {
  const shifted = new Date(date.getTime() + 60 * 60 * 1000);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}

async function deliver(input: {
  taskId: string;
  userId: string;
  kind: string;
  scheduledFor: Date;
  title: string;
  message: string;
  href: string;
}) {
  const existing = await prisma.taskReminderDelivery.findUnique({
    where: {
      taskId_userId_kind_scheduledFor: {
        taskId: input.taskId,
        userId: input.userId,
        kind: input.kind,
        scheduledFor: input.scheduledFor
      }
    },
    select: { id: true }
  });
  if (existing) return;
  try {
    await prisma.taskReminderDelivery.create({
      data: { taskId: input.taskId, userId: input.userId, kind: input.kind, scheduledFor: input.scheduledFor }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    throw error;
  }

  try {
    await createNotification({ userId: input.userId, title: input.title, message: input.message, href: input.href });
  } catch (error) {
    await prisma.taskReminderDelivery.deleteMany({
      where: { taskId: input.taskId, userId: input.userId, kind: input.kind, scheduledFor: input.scheduledFor }
    });
    throw error;
  }
}

export async function ensureTaskRemindersForUser(user: { id: string; role: Role }) {
  const now = new Date();
  const tasks = await prisma.task.findMany({
    where: { assigneeId: user.id, status: { in: OPEN_STATUSES } },
    select: { id: true, taskCode: true, name: true, status: true, startAt: true, dueAt: true, reminderOffsets: true },
    take: 200
  });

  for (const task of tasks) {
    const href = taskHref(user.role, task.id);
    if (task.status === TaskStatus.ASSIGNED && task.startAt && task.startAt <= now) {
      await deliver({
        taskId: task.id,
        userId: user.id,
        kind: "START",
        scheduledFor: task.startAt,
        title: "Task is ready to start",
        message: `${task.taskCode}: ${task.name}`,
        href
      });
    }

    if (task.dueAt <= now) {
      const day = lagosDayKey(now);
      await deliver({
        taskId: task.id,
        userId: user.id,
        kind: "OVERDUE",
        scheduledFor: day,
        title: "Task overdue",
        message: `${task.taskCode}: ${task.name} is past its deadline. Update the task or contact your manager.`,
        href
      });
      continue;
    }

    const eligible = task.reminderOffsets
      .filter((minutes) => minutes >= 0)
      .map((minutes) => ({ minutes, scheduledFor: new Date(task.dueAt.getTime() - minutes * 60_000) }))
      .filter((item) => item.scheduledFor <= now)
      .sort((a, b) => b.scheduledFor.getTime() - a.scheduledFor.getTime())[0];
    if (!eligible) continue;
    const label = eligible.minutes >= 1440
      ? `${Math.round(eligible.minutes / 1440)} day${eligible.minutes >= 2880 ? "s" : ""}`
      : eligible.minutes >= 60
        ? `${Math.round(eligible.minutes / 60)} hour${eligible.minutes >= 120 ? "s" : ""}`
        : eligible.minutes > 0
          ? `${eligible.minutes} minutes`
          : "now";
    await deliver({
      taskId: task.id,
      userId: user.id,
      kind: `DUE_${eligible.minutes}`,
      scheduledFor: eligible.scheduledFor,
      title: eligible.minutes === 0 ? "Task deadline reached" : `Task due in ${label}`,
      message: `${task.taskCode}: ${task.name}`,
      href
    });
  }

  if (user.role === Role.EMPLOYEE) return;
  const overdue = await prisma.task.findMany({
    where: {
      assignedById: user.id,
      status: { in: OPEN_STATUSES },
      dueAt: { lt: now }
    },
    select: { id: true, taskCode: true, name: true, assignee: { select: { firstName: true, lastName: true } } },
    take: 100
  });
  const day = lagosDayKey(now);
  for (const task of overdue) {
    await deliver({
      taskId: task.id,
      userId: user.id,
      kind: "MANAGER_OVERDUE",
      scheduledFor: day,
      title: "Delegated task overdue",
      message: `${task.taskCode}: ${task.name}, assigned to ${task.assignee.firstName} ${task.assignee.lastName}, needs follow-up.`,
      href: taskHref(user.role, task.id)
    });
  }
}
