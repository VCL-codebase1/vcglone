import { Role, TaskStatus, TaskStepStatus } from "@prisma/client";
import Link from "next/link";
import { TaskProductivityTrendChart, TaskStatusDistributionChart, TaskTeamPerformanceChart } from "@/components/task-analytics-charts";
import { TaskReportActions } from "@/components/task-report-actions";
import { Card, EmptyState, MetricStrip, PageHeader, PageToolbar, Select, StatusBadge, Table, WorkspaceSection } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { getTaskReportData, type TaskReportFilters } from "@/lib/task-reporting";
import { isTaskOverdue, taskHref } from "@/lib/tasks";

type ReportScope = "mine" | "team" | "organization";

function percent(value: number) { return `${value}%`; }
function duration(value: number) {
  if (!value) return "—";
  if (value < 24) return `${value}h`;
  return `${Math.round((value / 24) * 10) / 10}d`;
}

export async function TaskReportPage({ scope, searchParams }: { scope: ReportScope; searchParams?: { period?: string; date?: string; employeeId?: string; departmentId?: string } }) {
  const actor = await requireUser();
  const filters: TaskReportFilters = { scope, period: searchParams?.period, date: searchParams?.date, employeeId: searchParams?.employeeId, departmentId: searchParams?.departmentId };
  const [report, departments, employees] = await Promise.all([
    getTaskReportData(actor, filters),
    scope === "mine" ? [] : prisma.department.findMany({
      where: actor.role === Role.MANAGER ? { employees: { some: { employmentStatus: "ACTIVE", OR: [{ managerId: actor.id }, { secondaryManagerId: actor.id }] } } } : undefined,
      orderBy: { name: "asc" }
    }),
    scope === "mine" ? [] : prisma.user.findMany({
      where: {
        employmentStatus: "ACTIVE",
        role: { not: Role.SUPER_ADMIN },
        ...(actor.role === Role.MANAGER ? { OR: [{ managerId: actor.id }, { secondaryManagerId: actor.id }] } : {}),
        ...(searchParams?.departmentId ? { departmentId: searchParams.departmentId } : {})
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
    })
  ]);
  const title = scope === "mine" ? "My Task Reports" : scope === "team" ? "Team Task Analytics" : "Organization Task Analytics";
  const description = scope === "mine" ? "Daily, weekly, and monthly task reports." : scope === "team" ? "Team task reports." : "Employee and department task reports.";
  const exportParams = new URLSearchParams({ scope, period: report.range.period, date: report.range.dateInput });
  if (searchParams?.employeeId) exportParams.set("employeeId", searchParams.employeeId);
  if (searchParams?.departmentId) exportParams.set("departmentId", searchParams.departmentId);
  const exportHref = `/api/reports/tasks?${exportParams.toString()}`;
  const delegationExportHref = `/api/reports/task-steps?${exportParams.toString()}`;
  const pdfHref = `/api/reports/tasks/pdf?${exportParams.toString()}`;
  const overdueNow = new Date();

  return <div className="task-report-print space-y-6">
    <PageHeader title={title} description={`${description} Reporting period: ${report.range.label}.`} action={<TaskReportActions csvHref={exportHref} pdfHref={pdfHref} delegationCsvHref={delegationExportHref} />} />
    <PageToolbar className="print:hidden">
      <form className={`grid gap-3 ${scope === "mine" ? "md:grid-cols-[180px_1fr_auto]" : "md:grid-cols-2 xl:grid-cols-[160px_180px_1fr_1fr_auto]"}`}>
        <Select name="period" defaultValue={report.range.period}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></Select>
        <input name="date" type="date" defaultValue={report.range.dateInput} className="workspace-control" />
        {scope !== "mine" ? <><Select name="departmentId" defaultValue={searchParams?.departmentId || ""}><option value="">All departments</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</Select><Select name="employeeId" defaultValue={searchParams?.employeeId || ""}><option value="">Entire {scope === "team" ? "team" : "organization"}</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}</Select></> : null}
        <button className="workspace-action">Generate report</button>
      </form>
    </PageToolbar>

    <MetricStrip items={[
        ["Assigned", report.metrics.assigned, "Created in period"],
        ["Completed", report.metrics.completed, "Approved in period"],
        ["Due", report.metrics.due, "Deadlines in period"],
        ["Overdue", report.metrics.overdue, "Current backlog"],
        ["Completion rate", percent(report.metrics.completionRate), "Due work completed"],
        ["On-time rate", percent(report.metrics.onTimeRate), "Completed by deadline"],
        ["Avg. completion", duration(report.metrics.averageCompletionHours), "Start to approval"]
      ].map(([label, value, detail]) => ({ label: String(label), value, detail: String(detail) }))} className="xl:grid xl:grid-cols-7" />

    <div className="grid border-t border-line pt-6 xl:grid-cols-2 xl:divide-x xl:divide-line">
      <section className="min-w-0 pb-6 xl:pb-0 xl:pr-7"><h2 className="font-semibold text-ink">Productivity trend</h2><p className="text-sm text-muted">Tasks assigned compared with manager-approved completions.</p><TaskProductivityTrendChart data={report.trend} /></section>
      <section className="min-w-0 border-t border-line pt-6 xl:border-t-0 xl:pl-7 xl:pt-0"><h2 className="font-semibold text-ink">Current task status</h2><p className="text-sm text-muted">See how work is progressing for the selected period and filters.</p><TaskStatusDistributionChart data={report.statusData} /></section>
    </div>

    <WorkspaceSection title="Interdepartmental handoffs" description="Track work requested across departments, including response time, blockers, deadlines, and completion.">
      <MetricStrip items={[
          ["Tracked", report.delegationMetrics.total],
          ["Active", report.delegationMetrics.active],
          ["Blocked", report.delegationMetrics.blocked],
          ["Overdue", report.delegationMetrics.overdue],
          ["Completed", report.delegationMetrics.completed],
          ["On time", percent(report.delegationMetrics.onTimeRate)],
          ["Avg. response", duration(report.delegationMetrics.averageResponseHours)],
          ["Avg. completion", duration(report.delegationMetrics.averageCompletionHours)]
        ].map(([label, value]) => ({ label: String(label), value }))} className="mb-5 xl:grid xl:grid-cols-8" />
      {report.delegatedSteps.length ? <Table><thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Task step</th><th className="px-4 py-3">Handoff</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Assigned</th><th className="px-4 py-3">Deadline</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-line">{report.delegatedSteps.slice(0, 100).map((step) => {
        const stepOverdue = step.dueAt < overdueNow && step.status !== TaskStepStatus.COMPLETED && step.status !== TaskStepStatus.CANCELLED;
        return <tr key={step.id}><td className="px-4 py-3"><Link href={taskHref(actor.role, step.task.id)} className="font-semibold text-brand hover:underline">{step.title}</Link><p className="text-xs text-muted">{step.task.taskCode} · Step {step.position}</p></td><td className="px-4 py-3">{step.sourceDepartment?.name || "Unassigned"} → {step.targetDepartment?.name || "Unassigned"}</td><td className="px-4 py-3">{step.assignee.firstName} {step.assignee.lastName}</td><td className="px-4 py-3">{formatDateTime(step.createdAt)}</td><td className={stepOverdue ? "px-4 py-3 font-semibold text-amber-700" : "px-4 py-3"}>{formatDateTime(step.dueAt)}</td><td className="px-4 py-3"><StatusBadge value={stepOverdue ? "OVERDUE" : step.status} /></td></tr>;
      })}</tbody></Table> : <EmptyState title="No interdepartmental handoffs" description="Cross-department task steps in this reporting period will appear here." />}
      {report.delegatedSteps.length > 100 ? <p className="text-xs text-muted">Showing the first 100 handoffs. Download the full handoff report to see all {report.delegatedSteps.length}.</p> : null}
    </WorkspaceSection>
    {scope !== "mine" ? <WorkspaceSection title="Team performance" description="Top ten employees by approved completions, with overdue backlog for context."><TaskTeamPerformanceChart data={report.people} /></WorkspaceSection> : null}

    {scope !== "mine" ? <Card className="space-y-3"><div><h2 className="font-semibold text-ink">Employee delivery overview</h2><p className="text-sm text-muted">Review delivery patterns alongside the quality and complexity of each person’s work.</p></div>{report.people.length ? <Table><thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Assigned</th><th className="px-4 py-3">Completed</th><th className="px-4 py-3">Overdue</th><th className="px-4 py-3">On time</th><th className="px-4 py-3">Avg. completion</th></tr></thead><tbody className="divide-y divide-line">{report.people.map((person) => <tr key={person.id}><td className="px-4 py-3 font-semibold text-ink"><Link className="text-brand hover:underline" href={`?period=${report.range.period}&date=${report.range.dateInput}&employeeId=${person.id}`}>{person.name}</Link></td><td className="px-4 py-3">{person.department}</td><td className="px-4 py-3">{person.assigned}</td><td className="px-4 py-3">{person.completed}</td><td className="px-4 py-3">{person.overdue}</td><td className="px-4 py-3">{percent(person.onTimeRate)}</td><td className="px-4 py-3">{duration(person.averageCompletionHours)}</td></tr>)}</tbody></Table> : <EmptyState title="No employee task activity" description="No task activity matches the selected period and filters." />}</Card> : null}

    {scope === "organization" ? <Card className="space-y-3"><div><h2 className="font-semibold text-ink">Department delivery analysis</h2><p className="text-sm text-muted">Compare throughput and backlog across departments.</p></div>{report.departments.length ? <Table><thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Department</th><th className="px-4 py-3">Contributors</th><th className="px-4 py-3">Assigned</th><th className="px-4 py-3">Completed</th><th className="px-4 py-3">Overdue</th><th className="px-4 py-3">On time</th></tr></thead><tbody className="divide-y divide-line">{report.departments.map((department) => <tr key={department.name}><td className="px-4 py-3 font-semibold text-ink">{department.name}</td><td className="px-4 py-3">{department.members}</td><td className="px-4 py-3">{department.assigned}</td><td className="px-4 py-3">{department.completed}</td><td className="px-4 py-3">{department.overdue}</td><td className="px-4 py-3">{percent(department.onTimeRate)}</td></tr>)}</tbody></Table> : <EmptyState title="No department task activity" description="Department comparisons will appear when tasks exist." />}</Card> : null}

    <Card className="space-y-3"><div><h2 className="font-semibold text-ink">Task details</h2><p className="text-sm text-muted">See tasks assigned, due, completed, or still open during the selected period. The download includes every matching task.</p></div>{report.tasks.length ? <Table><thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Task</th><th className="px-4 py-3">Assignee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Deadline</th><th className="px-4 py-3">Completed</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-line">{report.tasks.slice(0, 100).map((task) => <tr key={task.id}><td className="px-4 py-3"><Link href={taskHref(actor.role, task.id)} className="font-semibold text-brand hover:underline">{task.name}</Link><p className="text-xs text-muted">{task.taskCode}</p></td><td className="px-4 py-3">{task.assignee.firstName} {task.assignee.lastName}</td><td className="px-4 py-3">{task.assignee.department?.name || "—"}</td><td className="px-4 py-3">{formatDateTime(task.dueAt)}</td><td className="px-4 py-3">{formatDateTime(task.completedAt)}</td><td className="px-4 py-3"><StatusBadge value={isTaskOverdue(task, overdueNow) ? "OVERDUE" : task.status} /></td></tr>)}</tbody></Table> : <EmptyState title="No task report data" description="Try a different date or broaden the filters." />}{report.tasks.length > 100 ? <p className="text-xs text-muted">Showing the first 100 tasks. Download the full report to see all {report.tasks.length}.</p> : null}</Card>
  </div>;
}
