import { LeaveRequestStatus, Role } from "@prisma/client";
import { csvResponse, toCsv } from "@/lib/csv";
import { formatDate, formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";

export async function GET(request: Request) {
  await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const { searchParams } = new URL(request.url);
  const requests = await prisma.leaveRequest.findMany({
    where: {
      employeeId: searchParams.get("employee") || undefined,
      leaveTypeId: searchParams.get("type") || undefined,
      status: searchParams.get("status") ? (searchParams.get("status") as LeaveRequestStatus) : undefined
    },
    include: { employee: { include: { department: true } }, leaveType: true, managerApprover: true, hrApprover: true },
    orderBy: { createdAt: "desc" }
  });
  const csv = toCsv(requests.map((request) => ({
    employee: `${request.employee.firstName} ${request.employee.lastName}`,
    email: request.employee.email,
    department: request.employee.department?.name || "",
    leaveType: request.leaveType.name,
    startDate: formatDate(request.startDate),
    endDate: formatDate(request.endDate),
    totalDays: request.totalDays,
    reason: request.reason,
    status: request.status,
    managerApprover: request.managerApprover ? `${request.managerApprover.firstName} ${request.managerApprover.lastName}` : "",
    hrApprover: request.hrApprover ? `${request.hrApprover.firstName} ${request.hrApprover.lastName}` : "",
    approvalComment: request.approvalComment,
    rejectionReason: request.rejectionReason,
    approvedAt: formatDateTime(request.approvedAt),
    rejectedAt: formatDateTime(request.rejectedAt)
  })));
  return csvResponse("leave-report.csv", csv);
}
