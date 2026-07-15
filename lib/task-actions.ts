"use server";

import { randomUUID } from "node:crypto";
import { Prisma, Role, TaskPriority, TaskResourceType, TaskStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/rbac";
import { canAccessTask, canAssignTo, taskHref } from "@/lib/tasks";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const createSchema = z.object({
  name: z.string().trim().min(3).max(160),
  description: z.string().trim().min(5).max(10000),
  expectedOutcome: z.string().trim().max(5000).optional(),
  assigneeId: z.string().min(1),
  priority: z.nativeEnum(TaskPriority),
  startAt: z.date().optional(),
  dueAt: z.date(),
  reminderOffsets: z.array(z.number().int().min(0).max(43200)).max(6)
});

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" && entry.trim() ? entry.trim() : undefined;
}

function localDateTime(input?: string) {
  if (!input) return undefined;
  const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(input) ? input : `${input}:00+01:00`);
  if (Number.isNaN(date.getTime())) throw new Error("Enter a valid date and time.");
  return date;
}

function taskCode() {
  return `TSK-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function revalidateTask(taskId: string) {
  [
    "/employee/tasks",
    `/employee/tasks/${taskId}`,
    "/manager/my-tasks",
    "/manager/tasks",
    `/manager/tasks/${taskId}`,
    "/admin/my-tasks",
    "/admin/tasks",
    `/admin/tasks/${taskId}`,
    "/employee/dashboard",
    "/manager/dashboard",
    "/admin/dashboard"
  ].forEach((path) => revalidatePath(path));
}

async function getTaskForActor(taskId: string) {
  const actor = await requireUser();
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true, role: true, managerId: true, secondaryManagerId: true } },
      assignedBy: { select: { id: true, firstName: true, lastName: true, role: true } }
    }
  });
  if (!task || !(await canAccessTask(actor, task))) throw new Error("Task not found or access denied.");
  return { actor, task };
}

function canReview(actor: { id: string; role: Role }, task: { assignedById: string; assignee: { managerId: string | null; secondaryManagerId: string | null } }) {
  return actor.role === Role.HR_ADMIN
    || actor.role === Role.SUPER_ADMIN
    || task.assignedById === actor.id
    || (actor.role === Role.MANAGER && (task.assignee.managerId === actor.id || task.assignee.secondaryManagerId === actor.id));
}

function filesFrom(formData: FormData) {
  return formData.getAll("resources").filter((item): item is File => item instanceof File && item.size > 0);
}

async function resourceCreates(formData: FormData, uploaderId: string) {
  const resources: Prisma.TaskResourceUncheckedCreateWithoutTaskInput[] = [];
  const links = (value(formData, "resourceLinks") || "").split(/\r?\n/).map((link) => link.trim()).filter(Boolean);
  for (const raw of links) {
    let url: URL;
    try { url = new URL(raw); } catch { throw new Error(`Invalid resource link: ${raw}`); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Resource links must use http or https.");
    resources.push({ uploaderId, type: TaskResourceType.LINK, title: url.hostname, url: url.toString() });
  }
  for (const file of filesFrom(formData)) {
    if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name} is larger than 5 MB.`);
    resources.push({
      uploaderId,
      type: TaskResourceType.FILE,
      title: file.name,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      data: Buffer.from(await file.arrayBuffer())
    });
  }
  return resources;
}

export async function createTask(formData: FormData) {
  const actor = await requireRole([Role.MANAGER, Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const reminderOffsets = formData.getAll("reminderOffsets").map(Number).filter(Number.isFinite);
  const parsed = createSchema.parse({
    name: value(formData, "name"),
    description: value(formData, "description"),
    expectedOutcome: value(formData, "expectedOutcome"),
    assigneeId: value(formData, "assigneeId"),
    priority: value(formData, "priority") || TaskPriority.MEDIUM,
    startAt: localDateTime(value(formData, "startAt")),
    dueAt: localDateTime(value(formData, "dueAt")),
    reminderOffsets: reminderOffsets.length ? reminderOffsets : [1440, 120, 0]
  });
  if (!(await canAssignTo(actor, parsed.assigneeId))) throw new Error("You can only assign tasks to active team members within your access.");
  if (parsed.dueAt <= new Date()) throw new Error("The deadline must be in the future.");
  if (parsed.startAt && parsed.startAt > parsed.dueAt) throw new Error("Start time must be before the deadline.");
  const resources = await resourceCreates(formData, actor.id);
  const task = await prisma.task.create({
    data: {
      taskCode: taskCode(),
      name: parsed.name,
      description: parsed.description,
      expectedOutcome: parsed.expectedOutcome,
      assigneeId: parsed.assigneeId,
      assignedById: actor.id,
      priority: parsed.priority,
      startAt: parsed.startAt,
      dueAt: parsed.dueAt,
      reminderOffsets: parsed.reminderOffsets,
      resources: { create: resources },
      activities: { create: { actorId: actor.id, action: "CREATED", message: `Task created and assigned.` } }
    },
    include: { assignee: { select: { firstName: true, lastName: true, role: true } } }
  });
  await Promise.all([
    createNotification({
      userId: task.assigneeId,
      title: "New task assigned",
      message: `${task.taskCode}: ${task.name}`,
      href: taskHref(task.assignee.role, task.id)
    }),
    createAuditLog({ actorId: actor.id, action: "TASK_CREATED", entityType: "Task", entityId: task.id, metadata: { taskCode: task.taskCode, assigneeId: task.assigneeId } })
  ]);
  revalidateTask(task.id);
  redirect(taskHref(actor.role, task.id));
}

export async function updateTask(formData: FormData) {
  const taskId = value(formData, "taskId");
  if (!taskId) throw new Error("Missing task.");
  const { actor, task } = await getTaskForActor(taskId);
  if (!canReview(actor, task)) throw new Error("Only the delegating manager or HR can edit this task.");
  if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED) throw new Error("Closed tasks cannot be edited.");
  const assigneeId = value(formData, "assigneeId") || task.assigneeId;
  if (!(await canAssignTo(actor, assigneeId))) throw new Error("Selected assignee is outside your access.");
  const dueAt = localDateTime(value(formData, "dueAt")) || task.dueAt;
  const reason = value(formData, "reason");
  if ((dueAt.getTime() !== task.dueAt.getTime() || assigneeId !== task.assigneeId) && !reason) throw new Error("Add a reason when changing the deadline or assignee.");
  const priority = z.nativeEnum(TaskPriority).parse(value(formData, "priority") || task.priority);
  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      assigneeId,
      dueAt,
      priority,
      activities: { create: { actorId: actor.id, action: "UPDATED", message: reason ? `Task updated: ${reason}` : "Task priority updated." } }
    },
    include: { assignee: { select: { role: true } } }
  });
  await createNotification({ userId: updated.assigneeId, title: "Task updated", message: `${updated.taskCode}: ${updated.name}${reason ? `. ${reason}` : ""}`, href: taskHref(updated.assignee.role, updated.id) });
  await createAuditLog({ actorId: actor.id, action: "TASK_UPDATED", entityType: "Task", entityId: task.id, metadata: { assigneeId, dueAt: dueAt.toISOString(), reason } });
  revalidateTask(task.id);
}

export async function startTask(formData: FormData) {
  const taskId = value(formData, "taskId");
  if (!taskId) throw new Error("Missing task.");
  const { actor, task } = await getTaskForActor(taskId);
  if (task.assigneeId !== actor.id) throw new Error("Only the assignee can start this task.");
  if (task.status !== TaskStatus.ASSIGNED && task.status !== TaskStatus.CHANGES_REQUESTED) throw new Error("This task cannot be started from its current status.");
  await prisma.task.update({ where: { id: task.id }, data: { status: TaskStatus.IN_PROGRESS, startedAt: task.startedAt || new Date(), blockedReason: null, activities: { create: { actorId: actor.id, action: "STARTED", message: task.status === TaskStatus.CHANGES_REQUESTED ? "Changes started." : "Work started." } } } });
  await createNotification({ userId: task.assignedById, title: "Task started", message: `${task.taskCode}: ${task.name}`, href: taskHref(task.assignedBy.role, task.id) });
  revalidateTask(task.id);
}

export async function blockTask(formData: FormData) {
  const taskId = value(formData, "taskId");
  const reason = value(formData, "reason");
  if (!taskId || !reason) throw new Error("Explain what is blocking the task.");
  const { actor, task } = await getTaskForActor(taskId);
  if (task.assigneeId !== actor.id || (task.status !== TaskStatus.ASSIGNED && task.status !== TaskStatus.IN_PROGRESS && task.status !== TaskStatus.CHANGES_REQUESTED)) throw new Error("This task cannot be blocked.");
  await prisma.task.update({ where: { id: task.id }, data: { status: TaskStatus.BLOCKED, blockedReason: reason, blockedAt: new Date(), activities: { create: { actorId: actor.id, action: "BLOCKED", message: `Blocked: ${reason}` } } } });
  await createNotification({ userId: task.assignedById, title: "Task blocked", message: `${task.taskCode}: ${reason}`, href: taskHref(task.assignedBy.role, task.id) });
  revalidateTask(task.id);
}

export async function resumeTask(formData: FormData) {
  const taskId = value(formData, "taskId");
  if (!taskId) throw new Error("Missing task.");
  const { actor, task } = await getTaskForActor(taskId);
  if (task.assigneeId !== actor.id || task.status !== TaskStatus.BLOCKED) throw new Error("This task is not available to resume.");
  await prisma.task.update({ where: { id: task.id }, data: { status: TaskStatus.IN_PROGRESS, blockedReason: null, activities: { create: { actorId: actor.id, action: "RESUMED", message: "Work resumed." } } } });
  await createNotification({ userId: task.assignedById, title: "Task resumed", message: `${task.taskCode}: ${task.name}`, href: taskHref(task.assignedBy.role, task.id) });
  revalidateTask(task.id);
}

export async function submitTaskForReview(formData: FormData) {
  const taskId = value(formData, "taskId");
  const note = value(formData, "note");
  if (!taskId) throw new Error("Missing task.");
  const { actor, task } = await getTaskForActor(taskId);
  if (task.assigneeId !== actor.id || (task.status !== TaskStatus.IN_PROGRESS && task.status !== TaskStatus.CHANGES_REQUESTED)) throw new Error("This task is not ready for submission.");
  await prisma.task.update({ where: { id: task.id }, data: { status: TaskStatus.IN_REVIEW, submissionNote: note, submittedAt: new Date(), activities: { create: { actorId: actor.id, action: "SUBMITTED", message: note ? `Submitted for review: ${note}` : "Submitted for review." } } } });
  await createNotification({ userId: task.assignedById, title: "Task ready for review", message: `${task.taskCode}: ${task.name}`, href: taskHref(task.assignedBy.role, task.id) });
  await createAuditLog({ actorId: actor.id, action: "TASK_SUBMITTED", entityType: "Task", entityId: task.id });
  revalidateTask(task.id);
}

export async function approveTask(formData: FormData) {
  const taskId = value(formData, "taskId");
  const comment = value(formData, "comment");
  if (!taskId) throw new Error("Missing task.");
  const { actor, task } = await getTaskForActor(taskId);
  if (!canReview(actor, task) || task.status !== TaskStatus.IN_REVIEW) throw new Error("This task is not awaiting your review.");
  const now = new Date();
  await prisma.task.update({ where: { id: task.id }, data: { status: TaskStatus.COMPLETED, reviewComment: comment, approvedAt: now, completedAt: now, activities: { create: { actorId: actor.id, action: "APPROVED", message: comment ? `Completion approved: ${comment}` : "Completion approved." } } } });
  await createNotification({ userId: task.assigneeId, title: "Task completion approved", message: `${task.taskCode}: ${task.name}`, href: taskHref(task.assignee.role, task.id) });
  await createAuditLog({ actorId: actor.id, action: "TASK_APPROVED", entityType: "Task", entityId: task.id });
  revalidateTask(task.id);
}

export async function requestTaskChanges(formData: FormData) {
  const taskId = value(formData, "taskId");
  const comment = value(formData, "comment");
  if (!taskId || !comment) throw new Error("Explain the changes required.");
  const { actor, task } = await getTaskForActor(taskId);
  if (!canReview(actor, task) || task.status !== TaskStatus.IN_REVIEW) throw new Error("This task is not awaiting your review.");
  await prisma.task.update({ where: { id: task.id }, data: { status: TaskStatus.CHANGES_REQUESTED, reviewComment: comment, activities: { create: { actorId: actor.id, action: "CHANGES_REQUESTED", message: `Changes requested: ${comment}` } } } });
  await createNotification({ userId: task.assigneeId, title: "Changes requested", message: `${task.taskCode}: ${comment}`, href: taskHref(task.assignee.role, task.id) });
  await createAuditLog({ actorId: actor.id, action: "TASK_CHANGES_REQUESTED", entityType: "Task", entityId: task.id, metadata: { comment } });
  revalidateTask(task.id);
}

export async function cancelTask(formData: FormData) {
  const taskId = value(formData, "taskId");
  const reason = value(formData, "reason");
  if (!taskId || !reason) throw new Error("Give a reason for cancelling the task.");
  const { actor, task } = await getTaskForActor(taskId);
  if (!canReview(actor, task) || task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED) throw new Error("This task cannot be cancelled.");
  await prisma.task.update({ where: { id: task.id }, data: { status: TaskStatus.CANCELLED, cancelledAt: new Date(), reviewComment: reason, activities: { create: { actorId: actor.id, action: "CANCELLED", message: `Task cancelled: ${reason}` } } } });
  await createNotification({ userId: task.assigneeId, title: "Task cancelled", message: `${task.taskCode}: ${reason}`, href: taskHref(task.assignee.role, task.id) });
  await createAuditLog({ actorId: actor.id, action: "TASK_CANCELLED", entityType: "Task", entityId: task.id, metadata: { reason } });
  revalidateTask(task.id);
}

export async function addTaskComment(formData: FormData) {
  const taskId = value(formData, "taskId");
  const body = value(formData, "body");
  if (!taskId || !body || body.length > 5000) throw new Error("Enter a comment up to 5,000 characters.");
  const { actor, task } = await getTaskForActor(taskId);
  await prisma.$transaction([
    prisma.taskComment.create({ data: { taskId, authorId: actor.id, body } }),
    prisma.taskActivity.create({ data: { taskId, actorId: actor.id, action: "COMMENTED", message: "Added a task comment." } })
  ]);
  const recipientId = actor.id === task.assigneeId ? task.assignedById : task.assigneeId;
  const recipientRole = actor.id === task.assigneeId ? task.assignedBy.role : task.assignee.role;
  if (recipientId !== actor.id) await createNotification({ userId: recipientId, title: "New task comment", message: `${task.taskCode}: ${body.slice(0, 120)}`, href: taskHref(recipientRole, task.id) });
  revalidateTask(task.id);
}

export async function addTaskResource(formData: FormData) {
  const taskId = value(formData, "taskId");
  if (!taskId) throw new Error("Missing task.");
  const { actor, task } = await getTaskForActor(taskId);
  if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED) throw new Error("Resources cannot be added to a closed task.");
  const resources = await resourceCreates(formData, actor.id);
  if (!resources.length) throw new Error("Add a link or choose a file.");
  await prisma.task.update({ where: { id: task.id }, data: { resources: { create: resources }, activities: { create: { actorId: actor.id, action: "RESOURCE_ADDED", message: `${resources.length} resource${resources.length === 1 ? "" : "s"} added.` } } } });
  revalidateTask(task.id);
}
