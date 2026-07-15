import { TaskStatus } from "@prisma/client";
import { csvResponse, toCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/dates";
import { requireUser } from "@/lib/rbac";
import { getTaskReportData } from "@/lib/task-reporting";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const actor = await requireUser();
  const { searchParams } = new URL(request.url);
  const report = await getTaskReportData(actor, {
    scope: searchParams.get("scope"),
    period: searchParams.get("period"),
    date: searchParams.get("date"),
    employeeId: searchParams.get("employeeId"),
    departmentId: searchParams.get("departmentId")
  });
  const now = new Date();
  const csv = toCsv(report.tasks.map((task) => {
    const start = task.startedAt || task.createdAt;
    const completionHours = task.completedAt ? Math.round(((task.completedAt.getTime() - start.getTime()) / 3_600_000) * 10) / 10 : "";
    const overdue = task.dueAt < now && task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.CANCELLED;
    return {
      taskId: task.taskCode,
      taskName: task.name,
      assignee: `${task.assignee.firstName} ${task.assignee.lastName}`,
      employeeId: task.assignee.employeeId,
      department: task.assignee.department?.name || "",
      delegatedBy: `${task.assignedBy.firstName} ${task.assignedBy.lastName}`,
      priority: task.priority,
      status: overdue ? "OVERDUE" : task.status,
      assignedAt: formatDateTime(task.createdAt),
      startedAt: formatDateTime(task.startedAt),
      deadline: formatDateTime(task.dueAt),
      submittedAt: formatDateTime(task.submittedAt),
      completedAt: formatDateTime(task.completedAt),
      completedOnTime: task.completedAt ? task.completedAt <= task.dueAt : "",
      completionHours,
      blockedReason: task.blockedReason || "",
      reviewComment: task.reviewComment || ""
    };
  }));
  return csvResponse(`task-report-${report.range.period}-${report.range.dateInput}.csv`, csv);
}
