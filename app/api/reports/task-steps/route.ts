import { TaskStepStatus } from "@prisma/client";
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
  const csv = toCsv(report.delegatedSteps.map((step) => {
    const overdue = step.dueAt < now && step.status !== TaskStepStatus.COMPLETED && step.status !== TaskStepStatus.CANCELLED;
    const responseHours = step.startedAt ? Math.round(((step.startedAt.getTime() - step.createdAt.getTime()) / 3_600_000) * 10) / 10 : "";
    const completionHours = step.completedAt ? Math.round(((step.completedAt.getTime() - (step.startedAt || step.createdAt).getTime()) / 3_600_000) * 10) / 10 : "";
    return {
      taskId: step.task.taskCode,
      taskName: step.task.name,
      stepNumber: step.position,
      stepName: step.title,
      required: step.required,
      sourceDepartment: step.sourceDepartment?.name || "",
      receivingDepartment: step.targetDepartment?.name || "",
      assignedEmployee: `${step.assignee.firstName} ${step.assignee.lastName}`,
      employeeId: step.assignee.employeeId || "",
      receivingManager: step.targetManager ? `${step.targetManager.firstName} ${step.targetManager.lastName}` : "",
      delegatedBy: `${step.assignedBy.firstName} ${step.assignedBy.lastName}`,
      status: overdue ? "OVERDUE" : step.status,
      assignedAt: formatDateTime(step.createdAt),
      startedAt: formatDateTime(step.startedAt),
      deadline: formatDateTime(step.dueAt),
      completedAt: formatDateTime(step.completedAt),
      completedOnTime: step.completedAt ? step.completedAt <= step.dueAt : "",
      responseHours,
      completionHours,
      blockedReason: step.blockedReason || "",
      completionNote: step.completionNote || ""
    };
  }));
  return csvResponse(`interdepartmental-task-steps-${report.range.period}-${report.range.dateInput}.csv`, csv);
}
