import { Prisma, Role, TaskPriority, TaskStatus } from "@prisma/client";
import Link from "next/link";
import { Card, EmptyState, LinkButton, PageHeader, Select, StatusBadge, Table } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { isTaskOverdue, taskHref } from "@/lib/tasks";

type Scope = "mine" | "team" | "organization";

export async function TaskListPage({
  scope,
  searchParams
}: {
  scope: Scope;
  searchParams?: { status?: string; priority?: string; q?: string; departmentId?: string };
}) {
  const user = await requireUser();
  const now = new Date();
  let scopeWhere: Prisma.TaskWhereInput;
  if (scope === "mine") scopeWhere = { OR: [{ assigneeId: user.id }, { steps: { some: { assigneeId: user.id } } }] };
  else if (scope === "team") {
    scopeWhere = {
      OR: [
        { assignedById: user.id },
        { assignee: { OR: [{ managerId: user.id }, { secondaryManagerId: user.id }] } },
        { steps: { some: { OR: [{ targetManagerId: user.id }, { assignee: { OR: [{ managerId: user.id }, { secondaryManagerId: user.id }] } }] } } }
      ]
    };
  } else {
    if (user.role !== Role.HR_ADMIN && user.role !== Role.SUPER_ADMIN) throw new Error("Access denied.");
    scopeWhere = {};
  }

  const status = searchParams?.status;
  const priority = searchParams?.priority;
  const q = searchParams?.q?.trim();
  const departmentId = scope === "mine" ? undefined : searchParams?.departmentId;
  const departmentWhere: Prisma.TaskWhereInput = departmentId ? { OR: [{ assignee: { departmentId } }, { steps: { some: { targetDepartmentId: departmentId } } }] } : {};
  const statusWhere: Prisma.TaskWhereInput = status === "OVERDUE"
      ? { dueAt: { lt: now }, status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] } }
      : status && Object.values(TaskStatus).includes(status as TaskStatus)
        ? { status: status as TaskStatus }
        : {};
  const filterWhere: Prisma.TaskWhereInput = {
    AND: [
      scopeWhere,
      departmentWhere,
      statusWhere,
      priority && Object.values(TaskPriority).includes(priority as TaskPriority) ? { priority: priority as TaskPriority } : {},
      q ? { OR: [{ taskCode: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }, { assignee: { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }] } }, { steps: { some: { OR: [{ title: { contains: q, mode: "insensitive" } }, { assignee: { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }] } }] } } }] } : {}
    ]
  };
  const [tasks, metricTasks, departments] = await Promise.all([
    prisma.task.findMany({
      where: filterWhere,
      include: { assignee: { select: { firstName: true, lastName: true } }, assignedBy: { select: { firstName: true, lastName: true } }, steps: { where: scope === "mine" ? { assigneeId: user.id } : undefined, select: { id: true, status: true, interdepartmental: true } }, _count: { select: { comments: true, resources: true, steps: true } } },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      take: 250
    }),
    prisma.task.findMany({ where: { AND: [scopeWhere, departmentWhere] }, select: { status: true, dueAt: true }, take: 1000 }),
    scope === "mine" ? [] : prisma.department.findMany({
      where: scope === "team" ? { employees: { some: { employmentStatus: "ACTIVE", OR: [{ managerId: user.id }, { secondaryManagerId: user.id }] } } } : undefined,
      orderBy: { name: "asc" }
    })
  ]);
  const overdue = metricTasks.filter((task) => isTaskOverdue(task, now)).length;
  const inReview = metricTasks.filter((task) => task.status === TaskStatus.IN_REVIEW).length;
  const active = metricTasks.filter((task) => task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.CANCELLED).length;
  const complete = metricTasks.filter((task) => task.status === TaskStatus.COMPLETED).length;
  const title = scope === "mine" ? "My Tasks" : scope === "team" ? "Team Tasks" : "Organization Tasks";
  const description = scope === "mine"
    ? "Prioritize your work, raise blockers early, and submit completed work for review."
    : scope === "team"
      ? "Assign work, track progress, resolve blockers, and review completed tasks."
      : "See workload, deadlines, blockers, and delivery across the organization.";
  const canCreate = scope !== "mine" && user.role !== Role.EMPLOYEE;
  const createHref = user.role === Role.MANAGER ? "/manager/tasks/new" : "/admin/tasks/new";

  return (
    <div className="space-y-5">
      <PageHeader title={departmentId ? `${departments.find((item) => item.id === departmentId)?.name || "Department"} Tasks` : title} description={description} action={canCreate ? <LinkButton href={createHref}>Delegate task</LinkButton> : undefined} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Active", active, "Open work"],
          ["In review", inReview, "Needs a decision"],
          ["Overdue", overdue, "Past deadline"],
          ["Completed", complete, "Manager approved"]
        ].map(([label, count, detail]) => (
          <Card key={String(label)} className="p-4"><p className="text-sm font-medium text-muted">{label}</p><p className="mt-1 text-2xl font-semibold text-ink">{count}</p><p className="text-xs text-muted">{detail}</p></Card>
        ))}
      </div>
      <Card className="p-4">
        <form className={`grid gap-3 ${scope === "mine" ? "md:grid-cols-[minmax(180px,1fr)_180px_160px_auto]" : "md:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_180px_160px_200px_auto]"}`}>
          <input name="q" defaultValue={q} placeholder="Search task, ID, or employee" className="focus-ring min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink dark:bg-panel" />
          <Select name="status" defaultValue={status || ""}>
            <option value="">All statuses</option><option value="OVERDUE">Overdue</option>
            {Object.values(TaskStatus).map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
          </Select>
          <Select name="priority" defaultValue={priority || ""}>
            <option value="">All priorities</option>{Object.values(TaskPriority).map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
          {scope !== "mine" ? <Select name="departmentId" defaultValue={departmentId || ""}><option value="">All departments</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</Select> : null}
          <button className="focus-ring min-h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-white">Apply filters</button>
        </form>
      </Card>
      {tasks.length ? (
        <>
          <div className="space-y-3 md:hidden">
            {tasks.map((task) => {
              const overdueTask = isTaskOverdue(task, now);
              return <Link key={task.id} href={taskHref(user.role, task.id)} className="block"><Card className="space-y-3 transition hover:-translate-y-0.5 hover:border-brand/30">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-brand">{task.taskCode}</p><h2 className="mt-1 break-words font-semibold text-ink">{task.name}</h2></div><StatusBadge value={overdueTask ? "OVERDUE" : task.status} /></div>
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface p-3 text-sm"><div><p className="text-xs text-muted">Assignee</p><p className="font-medium text-ink">{task.assignee.firstName} {task.assignee.lastName}</p></div><div><p className="text-xs text-muted">Deadline</p><p className={overdueTask ? "font-semibold text-amber-700" : "font-medium text-ink"}>{formatDateTime(task.dueAt)}</p></div></div>
                <div className="flex items-center justify-between text-xs text-muted"><span>{task.priority} priority</span><span>{task._count.resources} resources · {task._count.comments} comments</span></div>
                {task.steps.length && task.assigneeId !== user.id ? <p className="rounded-lg bg-brandSoft px-3 py-2 text-xs font-semibold text-brand">{task.steps.length} delegated step{task.steps.length === 1 ? "" : "s"} assigned to you</p> : null}
              </Card></Link>;
            })}
          </div>
          <div className="hidden md:block"><Table><thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Task</th><th className="px-4 py-3">Assignee</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Deadline</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-line">{tasks.map((task) => {
            const overdueTask = isTaskOverdue(task, now);
            return <tr key={task.id} className="transition hover:bg-surface/60"><td className="px-4 py-3"><Link href={taskHref(user.role, task.id)} className="font-semibold text-brand hover:underline">{task.name}</Link><p className="text-xs text-muted">{task.taskCode}</p>{task.steps.length && task.assigneeId !== user.id ? <p className="mt-1 text-xs font-semibold text-brand">{task.steps.length} delegated step{task.steps.length === 1 ? "" : "s"} for you</p> : null}</td><td className="px-4 py-3">{task.assignee.firstName} {task.assignee.lastName}</td><td className="px-4 py-3">{task.priority}</td><td className={overdueTask ? "px-4 py-3 font-semibold text-amber-700" : "px-4 py-3"}>{formatDateTime(task.dueAt)}</td><td className="px-4 py-3"><StatusBadge value={overdueTask ? "OVERDUE" : task.status} /></td></tr>;
          })}</tbody></Table></div>
        </>
      ) : <Card><EmptyState title="No tasks found" description={q || status || priority || departmentId ? "Try changing the filters." : "Tasks will appear here once they are assigned."} /></Card>}
    </div>
  );
}
