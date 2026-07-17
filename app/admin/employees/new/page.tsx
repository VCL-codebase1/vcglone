import { Role, EmploymentStatus } from "@prisma/client";
import { EmployeeCreateForm } from "@/components/employee-create-form";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";

export const runtime = "nodejs";

export default async function NewEmployeePage() {
  const actor = await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const [departments, managers] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: { in: ["MANAGER", "HR_ADMIN", "SUPER_ADMIN"] } }, orderBy: { firstName: "asc" } })
  ]);
  const roleOptions = actor.role === Role.SUPER_ADMIN
    ? [Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN]
    : [Role.EMPLOYEE, Role.MANAGER];
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="New Account" description="Create a workforce account with a secure initial password. Super Admin access cannot be created from this form." />
      <EmployeeCreateForm
        departments={departments}
        managers={managers.map(({ id, firstName, lastName }) => ({ id, firstName, lastName }))}
        roleOptions={roleOptions}
        employmentStatuses={Object.values(EmploymentStatus)}
      />
    </div>
  );
}


