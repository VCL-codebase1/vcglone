import { Role, TaskPriority } from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TaskCreateForm } from "@/components/task-create-form";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export async function TaskCreatePage() {
  const actor = await requireUser();
  const selfAssigned = actor.role === Role.EMPLOYEE;
  const [assignees, people, departments] = await Promise.all([
    prisma.user.findMany({
      where: {
        employmentStatus: "ACTIVE",
        role: { not: Role.SUPER_ADMIN },
        ...(selfAssigned ? { id: actor.id } : actor.role === Role.MANAGER ? { OR: [{ id: actor.id }, { managerId: actor.id }, { secondaryManagerId: actor.id }] } : {})
      },
      include: { department: { select: { name: true } } },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
    }),
    selfAssigned ? [] : prisma.user.findMany({
      where: { employmentStatus: "ACTIVE", role: { not: Role.SUPER_ADMIN }, departmentId: { not: null } },
      select: { id: true, firstName: true, lastName: true, departmentId: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
    }),
    selfAssigned ? [] : prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);
  const backHref = selfAssigned ? "/employee/tasks" : actor.role === Role.MANAGER ? "/manager/tasks" : "/admin/tasks";
  const minDate = new Date(Date.now() + 15 * 60_000).toISOString().slice(0, 16);

  return <div className="space-y-5">
    <PageHeader title={selfAssigned ? "Create a task" : "Delegate a task"} description={selfAssigned ? "Add a personal work task and deadline." : "Assign work and add any required steps."} action={<Link href={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-brand"><ArrowLeft className="h-4 w-4" />Back to tasks</Link>} />
    <TaskCreateForm
      assignees={assignees.map((person) => ({ id: person.id, name: `${person.firstName} ${person.lastName}`, departmentName: person.department?.name || null }))}
      people={people.map((person) => ({ id: person.id, name: `${person.firstName} ${person.lastName}`, departmentId: person.departmentId }))}
      departments={departments}
      priorities={Object.values(TaskPriority)}
      minDate={minDate}
      selfAssigned={selfAssigned}
    />
  </div>;
}
