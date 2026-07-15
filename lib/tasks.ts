import { Role, TaskStatus, type Task } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const closedTaskStatuses = [TaskStatus.COMPLETED, TaskStatus.CANCELLED] as const;
export const activeTaskStatuses = [
  TaskStatus.ASSIGNED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.BLOCKED,
  TaskStatus.IN_REVIEW,
  TaskStatus.CHANGES_REQUESTED
] as const;

export function isTaskOverdue(task: Pick<Task, "dueAt" | "status">, now = new Date()) {
  return task.dueAt.getTime() < now.getTime() && !closedTaskStatuses.includes(task.status as (typeof closedTaskStatuses)[number]);
}

export function taskHref(role: Role | string, taskId: string) {
  if (role === Role.HR_ADMIN || role === Role.SUPER_ADMIN) return `/admin/tasks/${taskId}`;
  if (role === Role.MANAGER) return `/manager/tasks/${taskId}`;
  return `/employee/tasks/${taskId}`;
}

export async function canAccessTask(user: { id: string; role: Role }, task: { assigneeId: string; assignedById: string }) {
  if (user.role === Role.HR_ADMIN || user.role === Role.SUPER_ADMIN) return true;
  if (task.assigneeId === user.id || task.assignedById === user.id) return true;
  if (user.role !== Role.MANAGER) return false;
  return Boolean(await prisma.user.findFirst({
    where: { id: task.assigneeId, OR: [{ managerId: user.id }, { secondaryManagerId: user.id }] },
    select: { id: true }
  }));
}

export async function canAssignTo(actor: { id: string; role: Role }, assigneeId: string) {
  if (actor.id === assigneeId) return actor.role !== Role.SUPER_ADMIN;
  const assignee = await prisma.user.findFirst({
    where: { id: assigneeId, employmentStatus: "ACTIVE", role: { not: Role.SUPER_ADMIN } },
    select: { id: true, managerId: true, secondaryManagerId: true }
  });
  if (!assignee) return false;
  if (actor.role === Role.HR_ADMIN || actor.role === Role.SUPER_ADMIN) return true;
  return actor.role === Role.MANAGER && (assignee.managerId === actor.id || assignee.secondaryManagerId === actor.id);
}

export function taskAudienceWhere(user: { id: string; role: Role }) {
  if (user.role === Role.HR_ADMIN || user.role === Role.SUPER_ADMIN) return {};
  if (user.role === Role.MANAGER) {
    return {
      OR: [
        { assigneeId: user.id },
        { assignedById: user.id },
        { assignee: { OR: [{ managerId: user.id }, { secondaryManagerId: user.id }] } }
      ]
    };
  }
  return { assigneeId: user.id };
}

export function taskStatusLabel(status: TaskStatus | string) {
  return status.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

