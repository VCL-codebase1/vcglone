import { csvResponse, toCsv } from "@/lib/csv";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { Role } from "@prisma/client";

export const runtime = "nodejs";

export async function GET() {
  await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const employees = await prisma.user.findMany({ include: { department: true, manager: true }, orderBy: { firstName: "asc" } });
  const csv = toCsv(employees.map((employee) => ({
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    phone: employee.phone,
    role: employee.role,
    department: employee.department?.name || "",
    manager: employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : "",
    employmentStatus: employee.employmentStatus,
    jobTitle: employee.jobTitle,
    dateJoined: formatDate(employee.dateJoined)
  })));
  return csvResponse("employee-report.csv", csv);
}
