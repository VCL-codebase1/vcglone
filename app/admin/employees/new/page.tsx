import { Role, EmploymentStatus } from "@prisma/client";
import { createEmployee } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { EmployeeProfileFields } from "@/components/employee-profile-fields";
import { Button, Card, Field, Input, PageHeader, Select } from "@/components/ui";

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
      <form action={createEmployee} className="grid gap-6 md:grid-cols-2">
        <Card className="grid gap-4 md:col-span-2 md:grid-cols-2">
          <div className="md:col-span-2"><h2 className="text-base font-semibold text-ink">Employment and hierarchy</h2></div>
          <Field label="First name"><Input name="firstName" required /></Field>
          <Field label="Last name"><Input name="lastName" required /></Field>
          <Field label="Email"><Input name="email" type="email" required /></Field>
          <Field label="Phone"><Input name="phone" /></Field>
          <Field label="Initial password" hint="Use at least 12 characters and share it securely."><Input name="password" type="password" minLength={12} autoComplete="new-password" required /></Field>
          <Field label="Job title"><Input name="jobTitle" /></Field>
          <Field label="Role"><Select name="role" defaultValue={Role.EMPLOYEE}>{roleOptions.map((role) => <option key={role}>{role}</option>)}</Select></Field>
          <Field label="Employment status"><Select name="employmentStatus" defaultValue={EmploymentStatus.ACTIVE}>{Object.values(EmploymentStatus).map((status) => <option key={status}>{status}</option>)}</Select></Field>
          <Field label="Department"><Select name="departmentId"><option value="">None</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</Select></Field>
          <Field label="Reporting manager"><Select name="managerId"><option value="">None</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.firstName} {manager.lastName}</option>)}</Select></Field>
          <Field label="Secondary reporting manager"><Select name="secondaryManagerId"><option value="">None</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.firstName} {manager.lastName}</option>)}</Select></Field>
          <Field label="Date joined"><Input name="dateJoined" type="date" /></Field>
        </Card>
        <EmployeeProfileFields />
        <div className="md:col-span-2"><Button type="submit">Create employee</Button></div>
      </form>
    </div>
  );
}


