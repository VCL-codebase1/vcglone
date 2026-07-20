"use server";

import { randomUUID } from "node:crypto";
import { Prisma, Role, TaskPriority, TaskResourceType, TaskStatus, TaskStepStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { createNotification, createNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push-notifications";
import { requireRole, requireUser } from "@/lib/rbac";
import { canAccessTask, canAssignTo, taskHref } from "@/lib/tasks";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const createSchema = z.object({
  name: z.string({ required_error: "Enter a task name." }).trim().min(3, "Use at least 3 characters for the task name.").max(160, "Keep the task name under 160 characters."),
  description: z.string({ required_error: "Enter a task description." }).trim().min(5, "Add a little more detail to the task description.").max(10000, "Keep the description under 10,000 characters."),
  expectedOutcome: z.string().trim().max(5000, "Keep the expected outcome under 5,000 characters.").optional(),
  assigneeId: z.string({ required_error: "Choose a team member." }).min(1, "Choose a team member."),
  priority: z.nativeEnum(TaskPriority),
  startAt: z.date().optional(),
  dueAt: z.date({ required_error: "Choose a deadline.", invalid_type_error: "Choose a valid deadline." }),
  reminderOffsets: z.array(z.number().int().min(0).max(43200)).max(6)
});

const draftStepSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  departmentId: z.string().min(1),
  assigneeId: z.string().min(1),
  dueAt: z.string().optional(),
  required: z.boolean().default(true)
});

const draftStepsSchema = z.array(draftStepSchema).max(30);

export type TaskCreateActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

function taskCreateError(message: string, fieldErrors?: Record<string, string>): TaskCreateActionState {
  return { status: "error", message, fieldErrors };
}

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

async function getStepForActor(stepId: string) {
  const actor = await requireUser();
  const step = await prisma.taskStep.findUnique({
    where: { id: stepId },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true, role: true, managerId: true, secondaryManagerId: true } },
      targetManager: { select: { id: true, role: true } },
      task: {
        include: {
          assignee: { select: { id: true, role: true } },
          assignedBy: { select: { id: true, role: true } }
        }
      }
    }
  });
  if (!step || !(await canAccessTask(actor, step.task))) throw new Error("Task step not found or access denied.");
  return { actor, step };
}

async function notifyStepStakeholders(
  step: Awaited<ReturnType<typeof getStepForActor>>["step"],
  actorId: string,
  title: string,
  message: string
) {
  const recipients = new Map<string, Role>();
  recipients.set(step.task.assignee.id, step.task.assignee.role);
  recipients.set(step.task.assignedBy.id, step.task.assignedBy.role);
  if (step.targetManager) recipients.set(step.targetManager.id, step.targetManager.role);
  recipients.delete(actorId);
  await createNotifications(Array.from(recipients, ([userId, role]) => ({ userId, title, message, href: taskHref(role, step.task.id) })));
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

export async function createTask(
  _previousState: TaskCreateActionState,
  formData: FormData
): Promise<TaskCreateActionState> {
  const actor = await requireRole([Role.MANAGER, Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const reminderOffsets = formData.getAll("reminderOffsets").map(Number).filter(Number.isFinite);
  let startAt: Date | undefined;
  let dueAt: Date | undefined;
  try {
    startAt = localDateTime(value(formData, "startAt"));
    dueAt = localDateTime(value(formData, "dueAt"));
  } catch {
    return taskCreateError("Enter a valid start time and deadline.", { dueAt: "Check the selected date and time." });
  }
  const result = createSchema.safeParse({
    name: value(formData, "name"),
    description: value(formData, "description"),
    expectedOutcome: value(formData, "expectedOutcome"),
    assigneeId: value(formData, "assigneeId"),
    priority: value(formData, "priority") || TaskPriority.MEDIUM,
    startAt,
    dueAt,
    reminderOffsets: reminderOffsets.length ? reminderOffsets : [1440, 120, 0]
  });
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = String(issue.path[0] || "form");
      fieldErrors[field] ||= issue.message;
    }
    return taskCreateError("Review the highlighted task details and try again.", fieldErrors);
  }
  const parsed = result.data;
  try {
    if (!(await canAssignTo(actor, parsed.assigneeId))) {
      return taskCreateError("Choose an active team member you are allowed to assign work to.", { assigneeId: "Select one of your active team members." });
    }
  } catch (error) {
    console.error("Task assignee check failed", error);
    return taskCreateError("We could not verify the assignee. No task was created. Please try again.");
  }
  if (parsed.dueAt <= new Date()) return taskCreateError("The deadline must be in the future.", { dueAt: "Choose a future date and time." });
  if (parsed.startAt && parsed.startAt > parsed.dueAt) return taskCreateError("The start time must be before the deadline.", { startAt: "Choose a time before the deadline." });
  let draftSteps: z.infer<typeof draftStepsSchema> = [];
  try {
    draftSteps = draftStepsSchema.parse(JSON.parse(value(formData, "taskSteps") || "[]"));
  } catch {
    return taskCreateError("Review the task steps and make sure every delegated step has a department and employee.", { taskSteps: "Complete or remove each unfinished step." });
  }
  const selectedIds = Array.from(new Set([parsed.assigneeId, ...draftSteps.filter((step) => step.assigneeId !== "MAIN").map((step) => step.assigneeId)]));
  let selectedPeople: Array<{
    id: string;
    firstName: string;
    lastName: string;
    role: Role;
    departmentId: string | null;
    managerId: string | null;
    secondaryManagerId: string | null;
    department: { managerId: string | null } | null;
  }>;
  try {
    selectedPeople = await prisma.user.findMany({
      where: { id: { in: selectedIds }, employmentStatus: "ACTIVE", role: { not: Role.SUPER_ADMIN } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        departmentId: true,
        managerId: true,
        secondaryManagerId: true,
        department: { select: { managerId: true } }
      }
    });
  } catch (error) {
    console.error("Task assignee loading failed", error);
    return taskCreateError("We could not load the selected employees. No task was created. Please try again.");
  }
  if (selectedPeople.length !== selectedIds.length) return taskCreateError("One or more selected employees are no longer available.", { taskSteps: "Review the task and step assignees." });
  const peopleById = new Map(selectedPeople.map((person) => [person.id, person]));
  const mainAssignee = peopleById.get(parsed.assigneeId);
  if (!mainAssignee) return taskCreateError("The main task assignee is no longer available.", { assigneeId: "Choose another team member." });
  const sourceDepartmentId = actor.departmentId || null;
  let steps: Prisma.TaskStepUncheckedCreateWithoutTaskInput[];
  try {
    steps = draftSteps.map((step, index) => {
      const assigneeId = step.assigneeId === "MAIN" ? parsed.assigneeId : step.assigneeId;
      const assignee = peopleById.get(assigneeId);
      if (!assignee) throw new Error(`Choose an active employee for step ${index + 1}.`);
      if (step.departmentId !== "MAIN" && assignee.departmentId !== step.departmentId) throw new Error(`The employee selected for step ${index + 1} is not in the selected department.`);
      const targetDepartmentId = assignee.departmentId;
      const stepDueAt = localDateTime(step.dueAt) || parsed.dueAt;
      if (stepDueAt <= new Date()) throw new Error(`The deadline for step ${index + 1} must be in the future.`);
      if (stepDueAt > parsed.dueAt) throw new Error(`The deadline for step ${index + 1} cannot be later than the main task deadline.`);
      const interdepartmental = Boolean(sourceDepartmentId && targetDepartmentId && sourceDepartmentId !== targetDepartmentId);
      return {
        title: step.title,
        description: step.description || null,
        position: index + 1,
        required: step.required,
        assigneeId,
        assignedById: actor.id,
        sourceDepartmentId,
        targetDepartmentId,
        targetManagerId: interdepartmental ? assignee.department?.managerId || assignee.managerId || assignee.secondaryManagerId || null : null,
        interdepartmental,
        dueAt: stepDueAt
      };
    });
  } catch (error) {
    return taskCreateError((error as Error).message, { taskSteps: "Review the step assignees and deadlines." });
  }
  let resources: Prisma.TaskResourceUncheckedCreateWithoutTaskInput[];
  try {
    resources = await resourceCreates(formData, actor.id);
  } catch (error) {
    return taskCreateError((error as Error).message, { resources: "Review the links and attached files." });
  }

  let task: { id: string; taskCode: string; assigneeId: string };
  let notificationInputs: Array<{ userId: string; title: string; message: string; href: string }>;
  try {
    const creation = await prisma.$transaction(async (transaction) => {
      const createdTask = await transaction.task.create({
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
          steps: { create: steps },
          activities: { create: { actorId: actor.id, action: "CREATED", message: steps.length ? `Task created and assigned with ${steps.length} step${steps.length === 1 ? "" : "s"}.` : "Task created and assigned." } }
        },
        include: { assignee: { select: { role: true } }, steps: true }
      });
      const notificationMap = new Map<string, { userId: string; title: string; message: string; href: string }>();
      notificationMap.set(createdTask.assigneeId, {
        userId: createdTask.assigneeId,
        title: "New task assigned",
        message: `${createdTask.taskCode}: ${createdTask.name}`,
        href: taskHref(createdTask.assignee.role, createdTask.id)
      });
      for (const step of createdTask.steps) {
        if (step.assigneeId !== createdTask.assigneeId) {
          const assignee = peopleById.get(step.assigneeId);
          if (assignee) notificationMap.set(step.assigneeId, {
            userId: step.assigneeId,
            title: step.interdepartmental ? "Interdepartmental task step assigned" : "Task step assigned",
            message: `${createdTask.taskCode}: ${step.title}`,
            href: taskHref(assignee.role, createdTask.id)
          });
        }
        if (step.interdepartmental && step.targetManagerId && step.targetManagerId !== actor.id && step.targetManagerId !== step.assigneeId) {
          const manager = peopleById.get(step.targetManagerId) || await transaction.user.findUnique({ where: { id: step.targetManagerId }, select: { role: true } });
          if (manager) notificationMap.set(step.targetManagerId, {
            userId: step.targetManagerId,
            title: "Interdepartmental work assigned to your team",
            message: `${createdTask.taskCode}: ${step.title}`,
            href: taskHref(manager.role, createdTask.id)
          });
        }
      }
      const notifications = Array.from(notificationMap.values());
      await transaction.notification.createMany({ data: notifications });
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "TASK_CREATED",
          entityType: "Task",
          entityId: createdTask.id,
          metadata: { taskCode: createdTask.taskCode, assigneeId: createdTask.assigneeId }
        }
      });
      return { task: createdTask, notifications };
    });
    task = creation.task;
    notificationInputs = creation.notifications;
  } catch (error) {
    console.error("Task creation failed", error);
    return taskCreateError("The task could not be created. Nothing was saved. Please try again.");
  }

  await Promise.allSettled(notificationInputs.map((notification) => sendPushToUser(notification.userId, notification)));
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
  const incompleteRequiredSteps = await prisma.taskStep.count({ where: { taskId: task.id, required: true, status: { not: TaskStepStatus.COMPLETED } } });
  if (incompleteRequiredSteps) throw new Error(`Complete the remaining ${incompleteRequiredSteps} required task step${incompleteRequiredSteps === 1 ? "" : "s"} before submitting.`);
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
  await prisma.task.update({ where: { id: task.id }, data: { status: TaskStatus.CANCELLED, cancelledAt: new Date(), reviewComment: reason, steps: { updateMany: { where: { status: { notIn: [TaskStepStatus.COMPLETED, TaskStepStatus.CANCELLED] } }, data: { status: TaskStepStatus.CANCELLED } } }, activities: { create: { actorId: actor.id, action: "CANCELLED", message: `Task cancelled: ${reason}` } } } });
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

export async function startTaskStep(formData: FormData) {
  const stepId = value(formData, "stepId");
  if (!stepId) throw new Error("Missing task step.");
  const { actor, step } = await getStepForActor(stepId);
  if (step.assigneeId !== actor.id || step.status !== TaskStepStatus.ASSIGNED) throw new Error("Only the assigned employee can start this step.");
  const startedAt = new Date();
  await prisma.$transaction([
    prisma.taskStep.update({ where: { id: step.id }, data: { status: TaskStepStatus.IN_PROGRESS, startedAt, blockedReason: null, blockedAt: null } }),
    prisma.taskActivity.create({ data: { taskId: step.taskId, actorId: actor.id, action: "STEP_STARTED", message: `Step ${step.position} started: ${step.title}`, metadata: { stepId: step.id } } })
  ]);
  await Promise.all([
    notifyStepStakeholders(step, actor.id, "Task step started", `${step.task.taskCode}: ${step.title}`),
    createAuditLog({ actorId: actor.id, action: "TASK_STEP_STARTED", entityType: "TaskStep", entityId: step.id, metadata: { taskId: step.taskId } })
  ]);
  revalidateTask(step.taskId);
}

export async function blockTaskStep(formData: FormData) {
  const stepId = value(formData, "stepId");
  const reason = value(formData, "reason");
  if (!stepId || !reason) throw new Error("Explain what is blocking this step.");
  const { actor, step } = await getStepForActor(stepId);
  if (step.assigneeId !== actor.id || (step.status !== TaskStepStatus.ASSIGNED && step.status !== TaskStepStatus.IN_PROGRESS)) throw new Error("This task step cannot be blocked.");
  await prisma.$transaction([
    prisma.taskStep.update({ where: { id: step.id }, data: { status: TaskStepStatus.BLOCKED, blockedAt: new Date(), blockedReason: reason } }),
    prisma.taskActivity.create({ data: { taskId: step.taskId, actorId: actor.id, action: "STEP_BLOCKED", message: `Step ${step.position} blocked: ${reason}`, metadata: { stepId: step.id } } })
  ]);
  await Promise.all([
    notifyStepStakeholders(step, actor.id, "Task step blocked", `${step.task.taskCode}: ${step.title}. ${reason}`),
    createAuditLog({ actorId: actor.id, action: "TASK_STEP_BLOCKED", entityType: "TaskStep", entityId: step.id, metadata: { taskId: step.taskId, reason } })
  ]);
  revalidateTask(step.taskId);
}

export async function resumeTaskStep(formData: FormData) {
  const stepId = value(formData, "stepId");
  if (!stepId) throw new Error("Missing task step.");
  const { actor, step } = await getStepForActor(stepId);
  if (step.assigneeId !== actor.id || step.status !== TaskStepStatus.BLOCKED) throw new Error("This task step is not available to resume.");
  await prisma.$transaction([
    prisma.taskStep.update({ where: { id: step.id }, data: { status: TaskStepStatus.IN_PROGRESS, blockedReason: null } }),
    prisma.taskActivity.create({ data: { taskId: step.taskId, actorId: actor.id, action: "STEP_RESUMED", message: `Step ${step.position} resumed: ${step.title}`, metadata: { stepId: step.id } } })
  ]);
  await notifyStepStakeholders(step, actor.id, "Task step resumed", `${step.task.taskCode}: ${step.title}`);
  revalidateTask(step.taskId);
}

export async function completeTaskStep(formData: FormData) {
  const stepId = value(formData, "stepId");
  const note = value(formData, "note");
  if (!stepId) throw new Error("Missing task step.");
  const { actor, step } = await getStepForActor(stepId);
  if (step.assigneeId !== actor.id || step.status !== TaskStepStatus.IN_PROGRESS) throw new Error("Start this task step before completing it.");
  await prisma.$transaction([
    prisma.taskStep.update({ where: { id: step.id }, data: { status: TaskStepStatus.COMPLETED, completedAt: new Date(), completionNote: note, blockedReason: null } }),
    prisma.taskActivity.create({ data: { taskId: step.taskId, actorId: actor.id, action: "STEP_COMPLETED", message: `Step ${step.position} completed: ${step.title}`, metadata: { stepId: step.id, note: note || null } } })
  ]);
  await Promise.all([
    notifyStepStakeholders(step, actor.id, "Task step completed", `${step.task.taskCode}: ${step.title}`),
    createAuditLog({ actorId: actor.id, action: "TASK_STEP_COMPLETED", entityType: "TaskStep", entityId: step.id, metadata: { taskId: step.taskId } })
  ]);
  revalidateTask(step.taskId);
}

export async function reassignTaskStep(formData: FormData) {
  const stepId = value(formData, "stepId");
  const assigneeId = value(formData, "assigneeId");
  if (!stepId || !assigneeId) throw new Error("Choose an employee for this task step.");
  const { actor, step } = await getStepForActor(stepId);
  const canReassign = actor.role === Role.HR_ADMIN || actor.role === Role.SUPER_ADMIN || step.assignedById === actor.id || step.targetManagerId === actor.id;
  if (!canReassign || step.status === TaskStepStatus.COMPLETED || step.status === TaskStepStatus.CANCELLED) throw new Error("You cannot reassign this task step.");
  const newAssignee = await prisma.user.findFirst({
    where: { id: assigneeId, employmentStatus: "ACTIVE", role: { not: Role.SUPER_ADMIN }, departmentId: step.targetDepartmentId },
    select: { id: true, role: true, firstName: true, lastName: true }
  });
  if (!newAssignee) throw new Error("Choose an active employee from the receiving department.");
  await prisma.$transaction([
    prisma.taskStep.update({ where: { id: step.id }, data: { assigneeId, status: TaskStepStatus.ASSIGNED, startedAt: null, blockedAt: null, blockedReason: null, completedAt: null, completionNote: null } }),
    prisma.taskActivity.create({ data: { taskId: step.taskId, actorId: actor.id, action: "STEP_REASSIGNED", message: `Step ${step.position} reassigned to ${newAssignee.firstName} ${newAssignee.lastName}.`, metadata: { stepId: step.id, previousAssigneeId: step.assigneeId, assigneeId } } })
  ]);
  await Promise.all([
    createNotification({ userId: newAssignee.id, title: step.interdepartmental ? "Interdepartmental task step assigned" : "Task step assigned", message: `${step.task.taskCode}: ${step.title}`, href: taskHref(newAssignee.role, step.taskId) }),
    createAuditLog({ actorId: actor.id, action: "TASK_STEP_REASSIGNED", entityType: "TaskStep", entityId: step.id, metadata: { taskId: step.taskId, previousAssigneeId: step.assigneeId, assigneeId } })
  ]);
  revalidateTask(step.taskId);
}
