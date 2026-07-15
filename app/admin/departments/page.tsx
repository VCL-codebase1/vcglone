import { createDepartment, updateDepartment } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { Button, Card, Field, Input, LinkButton, PageHeader, Select, Table, Textarea } from "@/components/ui";

export const runtime = "nodejs";

export default async function DepartmentsPage() {
  const [departments, managers] = await Promise.all([
    prisma.department.findMany({ include: { manager: true, employees: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: { in: ["MANAGER", "HR_ADMIN", "SUPER_ADMIN"] } }, orderBy: { firstName: "asc" } })
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Departments" description="Create departments and assign department managers." />
      <Card>
        <form action={createDepartment} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Name"><Input name="name" required /></Field>
          <Field label="Manager"><Select name="managerId"><option value="">None</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.firstName} {manager.lastName}</option>)}</Select></Field>
          <div className="md:col-span-2"><Field label="Description"><Textarea name="description" rows={2} /></Field></div>
          <div className="md:col-span-4"><Button type="submit">Create department</Button></div>
        </form>
      </Card>
      <Table>
        <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Department</th><th className="px-4 py-3">Manager</th><th className="px-4 py-3">Employees</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Action</th></tr></thead>
        <tbody className="divide-y divide-line">
          {departments.map((department) => (
            <tr key={department.id} className="align-top">
              <td className="px-4 py-3">
                <form id={`department-${department.id}`} action={updateDepartment} className="min-w-48">
                  <input type="hidden" name="id" value={department.id} />
                  <Input name="name" defaultValue={department.name} required />
                </form>
              </td>
              <td className="px-4 py-3">
                <Select name="managerId" form={`department-${department.id}`} defaultValue={department.managerId || ""}>
                  <option value="">None</option>
                  {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.firstName} {manager.lastName}</option>)}
                </Select>
              </td>
              <td className="px-4 py-3 font-semibold text-ink">{department.employees.length}</td>
              <td className="px-4 py-3">
                <Textarea name="description" form={`department-${department.id}`} defaultValue={department.description || ""} rows={2} />
              </td>
              <td className="px-4 py-3"><div className="flex flex-col gap-2"><Button type="submit" form={`department-${department.id}`} variant="secondary">Save</Button><LinkButton href={`/admin/tasks?departmentId=${department.id}`} variant="secondary">View tasks</LinkButton></div></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}



