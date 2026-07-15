import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { createTaskReportPdf } from "@/lib/task-report-pdf";
import { getTaskReportData, type TaskReportFilters } from "@/lib/task-reporting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const actor = await requireUser();
  const { searchParams } = new URL(request.url);
  const filters: TaskReportFilters = {
    scope: searchParams.get("scope"),
    period: searchParams.get("period"),
    date: searchParams.get("date"),
    employeeId: searchParams.get("employeeId"),
    departmentId: searchParams.get("departmentId")
  };
  const report = await getTaskReportData(actor, filters);
  const isAdmin = actor.role === Role.HR_ADMIN || actor.role === Role.SUPER_ADMIN;
  const teamScope = actor.role === Role.MANAGER && filters.scope === "team";
  const personalScope = filters.scope === "mine" || (!isAdmin && !teamScope);
  const scopeLabel = personalScope ? "Individual employee" : teamScope ? "Manager team" : "Organization-wide";

  const employee = filters.employeeId && !personalScope
    ? await prisma.user.findFirst({
        where: {
          id: filters.employeeId,
          ...(teamScope ? { OR: [{ managerId: actor.id }, { secondaryManagerId: actor.id }] } : {})
        },
        select: { firstName: true, lastName: true }
      })
    : personalScope
      ? await prisma.user.findUnique({ where: { id: actor.id }, select: { firstName: true, lastName: true } })
      : null;
  const department = filters.departmentId && !personalScope
    ? await prisma.department.findFirst({
        where: {
          id: filters.departmentId,
          ...(teamScope ? { employees: { some: { OR: [{ managerId: actor.id }, { secondaryManagerId: actor.id }] } } } : {})
        },
        select: { name: true }
      })
    : null;
  const focusLabel = [employee ? `${employee.firstName} ${employee.lastName}` : null, department?.name].filter(Boolean).join(" | ")
    || (personalScope ? "Personal task portfolio" : teamScope ? "Entire managed team" : "All departments and employees");
  const title = personalScope ? "Individual Task Performance Report" : teamScope ? "Team Task Performance Report" : "Organization Task Performance Report";
  const pdf = await createTaskReportPdf(report, {
    title,
    scopeLabel,
    focusLabel,
    generatedBy: `${actor.firstName} ${actor.lastName}`
  });
  const filename = `task-report-${report.range.period}-${report.range.dateInput}.pdf`;
  return new Response(new Blob([new Uint8Array(pdf)]), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
