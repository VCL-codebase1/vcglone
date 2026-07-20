import Link from "next/link";
import { Role } from "@prisma/client";
import { LinkButton, PageHeader, StatusBadge, Table } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function EmployeesPage() {
  const actor = await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const employees = await prisma.user.findMany({
    where: actor.role === Role.HR_ADMIN ? { role: { in: [Role.EMPLOYEE, Role.MANAGER] } } : undefined,
    include: { department: true, manager: true },
    orderBy: [{ firstName: "asc" }]
  });
  return (
    <div className="space-y-6">
      <PageHeader title="Accounts" description="Create accounts and keep employee details up to date." action={<LinkButton href="/admin/employees/new">New account</LinkButton>} />
      <Table>
        <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Employee ID</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3">Status</th></tr></thead>
        <tbody className="divide-y divide-line">
          {employees.map((employee) => (
            <tr key={employee.id}><td className="px-4 py-3 font-semibold text-ink">{employee.employeeId || "-"}</td><td className="px-4 py-3 font-medium">{employee.role === Role.SUPER_ADMIN ? <span>{employee.firstName} {employee.lastName} <span className="ml-1 text-xs font-normal text-muted">Protected</span></span> : <Link className="text-brand hover:underline" href={`/admin/employees/${employee.id}`}>{employee.firstName} {employee.lastName}</Link>}</td><td className="px-4 py-3">{employee.email}</td><td className="px-4 py-3">{employee.role.replace("_", " ")}</td><td className="px-4 py-3">{employee.department?.name || "-"}</td><td className="px-4 py-3">{formatDate(employee.dateJoined)}</td><td className="px-4 py-3"><StatusBadge value={employee.employmentStatus} /></td></tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}


