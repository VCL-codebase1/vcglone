import { Role, TaskStatus, type Prisma } from "@prisma/client";
import Link from "next/link";
import { Card, EmptyState, LinkButton, StatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { isTaskOverdue, taskHref } from "@/lib/tasks";

export async function TaskDashboardPanel({ user, scope }: { user: { id: string; role: Role }; scope: "mine" | "team" | "organization" }) {
  const now = new Date();
  const where: Prisma.TaskWhereInput = scope === "mine"
    ? { assigneeId: user.id }
    : scope === "team"
      ? { OR: [{ assignedById: user.id }, { assignee: { OR: [{ managerId: user.id }, { secondaryManagerId: user.id }] } }] }
      : {};
  const openWhere: Prisma.TaskWhereInput = { AND: [where, { status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] } }] };
  const [tasks, reviewCount, overdueCount] = await Promise.all([
    prisma.task.findMany({ where: openWhere, include: { assignee: { select: { firstName: true, lastName: true } } }, orderBy: { dueAt: "asc" }, take: 4 }),
    prisma.task.count({ where: { AND: [where, { status: TaskStatus.IN_REVIEW }] } }),
    prisma.task.count({ where: { AND: [openWhere, { dueAt: { lt: now } }] } })
  ]);
  const listHref = scope === "mine" ? (user.role === Role.MANAGER ? "/manager/my-tasks" : user.role === Role.EMPLOYEE ? "/employee/tasks" : "/admin/my-tasks") : scope === "team" ? "/manager/tasks" : "/admin/tasks";
  const title = scope === "mine" ? "My task focus" : scope === "team" ? "Team delivery" : "Organization delivery";

  return <Card className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-ink">{title}</h2><p className="text-sm text-muted">{overdueCount} overdue · {reviewCount} awaiting review</p></div><LinkButton href={listHref} variant="secondary">Open tasks</LinkButton></div>
    {tasks.length ? <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">{tasks.map((task) => {
      const overdue = isTaskOverdue(task, now);
      return <Link key={task.id} href={taskHref(user.role, task.id)} className="rounded-xl border border-line p-3 transition hover:-translate-y-0.5 hover:border-brand/30 hover:bg-surface/50"><div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-sm font-semibold text-ink">{task.name}</p><StatusBadge value={overdue ? "OVERDUE" : task.status} /></div><p className="mt-2 text-xs text-muted">{task.taskCode} · {task.assignee.firstName} {task.assignee.lastName}</p><p className={overdue ? "mt-1 text-xs font-semibold text-amber-700" : "mt-1 text-xs text-muted"}>Due {formatDateTime(task.dueAt)}</p></Link>;
    })}</div> : <EmptyState title="No active tasks" description="Open work will appear here." />}
  </Card>;
}
