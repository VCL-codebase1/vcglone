import { Role, TaskPriority } from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TaskStepsBuilder } from "@/components/task-steps-builder";
import { Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { createTask } from "@/lib/task-actions";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function TaskCreatePage() {
  const actor = await requireRole([Role.MANAGER, Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const [assignees, people, departments] = await Promise.all([
    prisma.user.findMany({
      where: {
        employmentStatus: "ACTIVE",
        role: { not: Role.SUPER_ADMIN },
        ...(actor.role === Role.MANAGER ? { OR: [{ id: actor.id }, { managerId: actor.id }, { secondaryManagerId: actor.id }] } : {})
      },
      include: { department: { select: { name: true } } },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
    }),
    prisma.user.findMany({
      where: { employmentStatus: "ACTIVE", role: { not: Role.SUPER_ADMIN }, departmentId: { not: null } },
      select: { id: true, firstName: true, lastName: true, departmentId: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
    }),
    prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);
  const backHref = actor.role === Role.MANAGER ? "/manager/tasks" : "/admin/tasks";
  const minDate = new Date(Date.now() + 15 * 60_000).toISOString().slice(0, 16);

  return <div className="space-y-5">
    <PageHeader title="Delegate a task" description="Assign the main work in seconds, then add only the steps that are genuinely needed." action={<Link href={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-brand"><ArrowLeft className="h-4 w-4" />Back to tasks</Link>} />
    <form action={createTask} encType="multipart/form-data" className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
      <Card className="space-y-5">
        <div><h2 className="font-semibold text-ink">Task brief</h2><p className="text-sm text-muted">Make the work and definition of done unambiguous.</p></div>
        <Field label="Task name"><Input name="name" required minLength={3} maxLength={160} placeholder="e.g. Prepare Q3 client performance report" /></Field>
        <Field label="Description" hint="Include context, scope, and any important constraints."><Textarea name="description" required minLength={5} rows={6} placeholder="Describe the work to be completed…" /></Field>
        <Field label="Expected outcome" hint="Optional, but useful for a faster completion review."><Textarea name="expectedOutcome" rows={3} placeholder="What should a successful result look like?" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Assign to"><Select name="assigneeId" required defaultValue=""><option value="" disabled>Select a team member</option>{assignees.map((person) => <option key={person.id} value={person.id}>{person.firstName} {person.lastName}{person.department?.name ? ` — ${person.department.name}` : ""}</option>)}</Select></Field>
          <Field label="Priority"><Select name="priority" defaultValue={TaskPriority.MEDIUM}>{Object.values(TaskPriority).map((item) => <option key={item} value={item}>{item}</option>)}</Select></Field>
          <Field label="Start date and time" hint="Optional"><Input type="datetime-local" name="startAt" min={minDate} /></Field>
          <Field label="Deadline"><Input type="datetime-local" name="dueAt" required min={minDate} /></Field>
        </div>
        <TaskStepsBuilder
          minDate={minDate}
          departments={departments}
          people={people.map((person) => ({ id: person.id, name: `${person.firstName} ${person.lastName}`, departmentId: person.departmentId }))}
        />
      </Card>
      <div className="space-y-5">
        <Card className="space-y-4">
          <div><h2 className="font-semibold text-ink">Task resources</h2><p className="text-sm text-muted">Attach working files or add one web link per line.</p></div>
          <Field label="Resource links"><Textarea name="resourceLinks" rows={4} placeholder={"https://…\nhttps://…"} /></Field>
          <Field label="Files" hint="Up to 5 MB per file. You can select multiple files."><Input type="file" name="resources" multiple /></Field>
        </Card>
        <Card className="space-y-4">
          <div><h2 className="font-semibold text-ink">Reminders</h2><p className="text-sm text-muted">Delivered while staff use the app; no cron job is required.</p></div>
          <div className="space-y-3">
            {[{ value: 1440, label: "24 hours before" }, { value: 120, label: "2 hours before" }, { value: 0, label: "At the deadline" }].map((item) => <label key={item.value} className="flex items-center gap-3 rounded-xl border border-line p-3 text-sm font-medium text-ink"><input type="checkbox" name="reminderOffsets" value={item.value} defaultChecked className="h-4 w-4 rounded border-line" />{item.label}</label>)}
          </div>
        </Card>
        <button className="focus-ring min-h-12 w-full rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-soft">Create and assign task</button>
      </div>
    </form>
  </div>;
}
