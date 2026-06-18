import { AttendanceStatus, Role } from "@prisma/client";
import { csvResponse, toCsv } from "@/lib/csv";
import { formatDate, formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";

export async function GET(request: Request) {
  await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const { searchParams } = new URL(request.url);
  const records = await prisma.attendanceRecord.findMany({
    where: {
      employeeId: searchParams.get("employee") || undefined,
      status: searchParams.get("status") ? (searchParams.get("status") as AttendanceStatus) : undefined,
      requiresReview: searchParams.get("location") === "missing" ? true : undefined,
      employee: { departmentId: searchParams.get("department") || undefined },
      date: {
        gte: searchParams.get("from") ? new Date(String(searchParams.get("from"))) : undefined,
        lte: searchParams.get("to") ? new Date(String(searchParams.get("to"))) : undefined
      }
    },
    include: { employee: { include: { department: true } } },
    orderBy: { date: "desc" }
  });

  const csv = toCsv(records.map((record) => ({
    employee: `${record.employee.firstName} ${record.employee.lastName}`,
    email: record.employee.email,
    department: record.employee.department?.name || "",
    date: formatDate(record.date),
    checkInTime: formatDateTime(record.checkInTime),
    checkOutTime: formatDateTime(record.checkOutTime),
    checkInLatitude: record.checkInLatitude,
    checkInLongitude: record.checkInLongitude,
    checkInAccuracy: record.checkInAccuracy,
    checkOutLatitude: record.checkOutLatitude,
    checkOutLongitude: record.checkOutLongitude,
    checkOutAccuracy: record.checkOutAccuracy,
    status: record.status,
    totalMinutes: record.totalMinutes,
    requiresReview: record.requiresReview,
    reviewReason: record.reviewReason,
    checkInNote: record.checkInNote,
    checkOutNote: record.checkOutNote
  })));
  return csvResponse("attendance-report.csv", csv);
}
