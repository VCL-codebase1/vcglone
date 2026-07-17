import { Prisma, Role, TaskStatus, TaskStepStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type TaskReportPeriod = "daily" | "weekly" | "monthly";
export type TaskReportActor = { id: string; role: Role };
export type TaskReportFilters = {
  scope?: "mine" | "team" | "organization" | string | null;
  period?: string | null;
  date?: string | null;
  employeeId?: string | null;
  departmentId?: string | null;
};

const OPEN_STATUSES = [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED, TaskStatus.IN_REVIEW, TaskStatus.CHANGES_REQUESTED];
const OPEN_STEP_STATUSES = [TaskStepStatus.ASSIGNED, TaskStepStatus.IN_PROGRESS, TaskStepStatus.BLOCKED];
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function lagosDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value)
  };
}

function parseDateInput(value?: string | null) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return { year, month, day };
  }
  return lagosDateParts();
}

function startInLagos(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day) - HOUR);
}

export function getTaskReportRange(periodInput?: string | null, dateInput?: string | null) {
  const period: TaskReportPeriod = periodInput === "daily" || periodInput === "weekly" ? periodInput : "monthly";
  const anchor = parseDateInput(dateInput);
  let start: Date;
  let end: Date;
  if (period === "daily") {
    start = startInLagos(anchor.year, anchor.month, anchor.day);
    end = new Date(start.getTime() + DAY);
  } else if (period === "weekly") {
    const dayOfWeek = new Date(Date.UTC(anchor.year, anchor.month - 1, anchor.day)).getUTCDay();
    const offsetFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    start = new Date(startInLagos(anchor.year, anchor.month, anchor.day).getTime() - offsetFromMonday * DAY);
    end = new Date(start.getTime() + 7 * DAY);
  } else {
    start = startInLagos(anchor.year, anchor.month, 1);
    end = startInLagos(anchor.year, anchor.month + 1, 1);
  }
  const label = period === "daily"
    ? new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", dateStyle: "long" }).format(start)
    : `${new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", month: "short", day: "numeric", year: "numeric" }).format(start)} – ${new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", month: "short", day: "numeric", year: "numeric" }).format(new Date(end.getTime() - 1))}`;
  return { period, start, end, label, dateInput: `${anchor.year}-${String(anchor.month).padStart(2, "0")}-${String(anchor.day).padStart(2, "0")}` };
}

export function taskReportScopeWhere(actor: TaskReportActor, filters: TaskReportFilters): Prisma.TaskWhereInput {
  const requestedScope = filters.scope;
  const base: Prisma.TaskWhereInput = requestedScope === "mine"
    ? { OR: [{ assigneeId: actor.id }, { steps: { some: { assigneeId: actor.id } } }] }
    : actor.role === Role.MANAGER && requestedScope === "team"
      ? { OR: [{ assignedById: actor.id }, { assignee: { OR: [{ managerId: actor.id }, { secondaryManagerId: actor.id }] } }, { steps: { some: { OR: [{ targetManagerId: actor.id }, { assignee: { OR: [{ managerId: actor.id }, { secondaryManagerId: actor.id }] } }] } } }] }
      : actor.role === Role.HR_ADMIN || actor.role === Role.SUPER_ADMIN
        ? {}
        : { assigneeId: actor.id };
  return {
    AND: [
      base,
      actor.role !== Role.EMPLOYEE && filters.employeeId ? { assigneeId: filters.employeeId } : {},
      actor.role !== Role.EMPLOYEE && filters.departmentId ? { assignee: { departmentId: filters.departmentId } } : {}
    ]
  };
}

export function taskStepReportScopeWhere(actor: TaskReportActor, filters: TaskReportFilters): Prisma.TaskStepWhereInput {
  const base: Prisma.TaskStepWhereInput = filters.scope === "mine"
    ? { assigneeId: actor.id }
    : actor.role === Role.MANAGER && filters.scope === "team"
      ? { OR: [{ assignedById: actor.id }, { targetManagerId: actor.id }, { assignee: { OR: [{ managerId: actor.id }, { secondaryManagerId: actor.id }] } }] }
      : actor.role === Role.HR_ADMIN || actor.role === Role.SUPER_ADMIN
        ? {}
        : { assigneeId: actor.id };
  return {
    AND: [
      base,
      { interdepartmental: true },
      actor.role !== Role.EMPLOYEE && filters.employeeId ? { assigneeId: filters.employeeId } : {},
      actor.role !== Role.EMPLOYEE && filters.departmentId ? { targetDepartmentId: filters.departmentId } : {}
    ]
  };
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function completionHours(task: { createdAt: Date; startedAt: Date | null; completedAt: Date | null }) {
  if (!task.completedAt) return null;
  return Math.max(0, (task.completedAt.getTime() - (task.startedAt || task.createdAt).getTime()) / HOUR);
}

function trendBuckets(period: TaskReportPeriod, start: Date, end: Date) {
  const count = period === "daily" ? 6 : Math.round((end.getTime() - start.getTime()) / DAY);
  const step = period === "daily" ? 4 * HOUR : DAY;
  return Array.from({ length: count }, (_, index) => {
    const bucketStart = new Date(start.getTime() + index * step);
    const bucketEnd = new Date(Math.min(end.getTime(), bucketStart.getTime() + step));
    const label = period === "daily"
      ? new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", hour: "numeric" }).format(bucketStart)
      : new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", month: "short", day: "numeric" }).format(bucketStart);
    return { label, start: bucketStart, end: bucketEnd, assigned: 0, completed: 0 };
  });
}

export async function getTaskReportData(actor: TaskReportActor, filters: TaskReportFilters) {
  const range = getTaskReportRange(filters.period, filters.date);
  const scopeWhere = taskReportScopeWhere(actor, filters);
  const now = new Date();
  const tasks = await prisma.task.findMany({
    where: {
      AND: [
        scopeWhere,
        { createdAt: { lt: range.end } },
        {
          OR: [
            { createdAt: { gte: range.start, lt: range.end } },
            { dueAt: { gte: range.start, lt: range.end } },
            { completedAt: { gte: range.start, lt: range.end } },
            { status: { in: OPEN_STATUSES } }
          ]
        }
      ]
    },
    include: {
      assignee: { include: { department: { select: { id: true, name: true } } } },
      assignedBy: { select: { firstName: true, lastName: true } }
    },
    orderBy: [{ dueAt: "asc" }],
    take: 5000
  });
  const delegatedSteps = await prisma.taskStep.findMany({
    where: {
      AND: [
        taskStepReportScopeWhere(actor, filters),
        { createdAt: { lt: range.end } },
        {
          OR: [
            { createdAt: { gte: range.start, lt: range.end } },
            { dueAt: { gte: range.start, lt: range.end } },
            { completedAt: { gte: range.start, lt: range.end } },
            { status: { in: OPEN_STEP_STATUSES } }
          ]
        }
      ]
    },
    include: {
      task: { select: { id: true, taskCode: true, name: true } },
      assignee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      assignedBy: { select: { firstName: true, lastName: true } },
      sourceDepartment: { select: { id: true, name: true } },
      targetDepartment: { select: { id: true, name: true } },
      targetManager: { select: { firstName: true, lastName: true } }
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    take: 5000
  });
  const inRange = (date: Date | null) => Boolean(date && date >= range.start && date < range.end);
  const assigned = tasks.filter((task) => inRange(task.createdAt));
  const completed = tasks.filter((task) => inRange(task.completedAt));
  const due = tasks.filter((task) => task.dueAt >= range.start && task.dueAt < range.end && task.status !== TaskStatus.CANCELLED);
  const overdue = tasks.filter((task) => task.dueAt < now && OPEN_STATUSES.includes(task.status as (typeof OPEN_STATUSES)[number]));
  const onTime = completed.filter((task) => task.completedAt && task.completedAt <= task.dueAt);
  const completedDue = due.filter((task) => task.completedAt && task.completedAt < range.end);
  const hours = completed.map(completionHours).filter((value): value is number => value !== null);
  const trend = trendBuckets(range.period, range.start, range.end);
  for (const task of assigned) {
    const bucket = trend.find((item) => task.createdAt >= item.start && task.createdAt < item.end);
    if (bucket) bucket.assigned += 1;
  }
  for (const task of completed) {
    const bucket = trend.find((item) => task.completedAt && task.completedAt >= item.start && task.completedAt < item.end);
    if (bucket) bucket.completed += 1;
  }

  const statusData = Object.values(TaskStatus).map((status) => ({
    name: status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()),
    value: tasks.filter((task) => task.status === status).length
  })).filter((item) => item.value > 0);

  const grouped = new Map<string, typeof tasks>();
  for (const task of tasks) grouped.set(task.assigneeId, [...(grouped.get(task.assigneeId) || []), task]);
  const people = Array.from(grouped.values()).map((personTasks) => {
    const person = personTasks[0].assignee;
    const personCompleted = personTasks.filter((task) => inRange(task.completedAt));
    const personHours = personCompleted.map(completionHours).filter((value): value is number => value !== null);
    const personOnTime = personCompleted.filter((task) => task.completedAt && task.completedAt <= task.dueAt).length;
    return {
      id: person.id,
      name: `${person.firstName} ${person.lastName}`,
      department: person.department?.name || "Unassigned",
      assigned: personTasks.filter((task) => inRange(task.createdAt)).length,
      completed: personCompleted.length,
      overdue: personTasks.filter((task) => task.dueAt < now && OPEN_STATUSES.includes(task.status as (typeof OPEN_STATUSES)[number])).length,
      onTimeRate: personCompleted.length ? Math.round((personOnTime / personCompleted.length) * 100) : 0,
      averageCompletionHours: Math.round(average(personHours) * 10) / 10
    };
  }).sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name));

  const departments = new Map<string, typeof people>();
  for (const person of people) departments.set(person.department, [...(departments.get(person.department) || []), person]);
  const departmentRows = Array.from(departments.entries()).map(([name, members]) => ({
    name,
    members: members.length,
    assigned: members.reduce((sum, item) => sum + item.assigned, 0),
    completed: members.reduce((sum, item) => sum + item.completed, 0),
    overdue: members.reduce((sum, item) => sum + item.overdue, 0),
    onTimeRate: members.reduce((sum, item) => sum + item.completed, 0)
      ? Math.round(members.reduce((sum, item) => sum + item.onTimeRate * item.completed, 0) / members.reduce((sum, item) => sum + item.completed, 0))
      : 0
  })).sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name));

  const completedDelegations = delegatedSteps.filter((step) => inRange(step.completedAt));
  const dueDelegations = delegatedSteps.filter((step) => step.dueAt >= range.start && step.dueAt < range.end && step.status !== TaskStepStatus.CANCELLED);
  const overdueDelegations = delegatedSteps.filter((step) => step.dueAt < now && OPEN_STEP_STATUSES.includes(step.status as (typeof OPEN_STEP_STATUSES)[number]));
  const startedDelegations = delegatedSteps.filter((step) => step.startedAt);
  const responseHours = startedDelegations.map((step) => Math.max(0, ((step.startedAt as Date).getTime() - step.createdAt.getTime()) / HOUR));
  const delegationHours = completedDelegations.map((step) => Math.max(0, ((step.completedAt as Date).getTime() - (step.startedAt || step.createdAt).getTime()) / HOUR));
  const onTimeDelegations = completedDelegations.filter((step) => step.completedAt && step.completedAt <= step.dueAt);

  return {
    range,
    metrics: {
      assigned: assigned.length,
      completed: completed.length,
      due: due.length,
      overdue: overdue.length,
      completionRate: due.length ? Math.round((completedDue.length / due.length) * 100) : 0,
      onTimeRate: completed.length ? Math.round((onTime.length / completed.length) * 100) : 0,
      averageCompletionHours: Math.round(average(hours) * 10) / 10
    },
    trend: trend.map(({ label, assigned: assignedCount, completed: completedCount }) => ({ label, assigned: assignedCount, completed: completedCount })),
    statusData,
    people,
    departments: departmentRows,
    tasks,
    delegatedSteps,
    delegationMetrics: {
      total: delegatedSteps.length,
      active: delegatedSteps.filter((step) => step.status === TaskStepStatus.ASSIGNED || step.status === TaskStepStatus.IN_PROGRESS).length,
      blocked: delegatedSteps.filter((step) => step.status === TaskStepStatus.BLOCKED).length,
      overdue: overdueDelegations.length,
      completed: completedDelegations.length,
      completionRate: dueDelegations.length ? Math.round((dueDelegations.filter((step) => step.completedAt && step.completedAt < range.end).length / dueDelegations.length) * 100) : 0,
      onTimeRate: completedDelegations.length ? Math.round((onTimeDelegations.length / completedDelegations.length) * 100) : 0,
      averageResponseHours: Math.round(average(responseHours) * 10) / 10,
      averageCompletionHours: Math.round(average(delegationHours) * 10) / 10
    }
  };
}
