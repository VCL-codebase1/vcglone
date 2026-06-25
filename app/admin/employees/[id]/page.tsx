import { EmploymentStatus, Role } from "@prisma/client";
import { notFound } from "next/navigation";
import { resetUserPassword, updateEmployee } from "@/lib/actions";
import { EmployeeProfileFields } from "@/components/employee-profile-fields";
import { compactDuration, formatDate, formatTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { canManageAccountRole, requireRole } from "@/lib/rbac";
import { Button, Card, Field, Input, PageHeader, Select, StatusBadge, Table } from "@/components/ui";

export const runtime = "nodejs";

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const actor = await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const [employee, departments, managers, attendance, leaveRequests, balances] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.id },
      include: { department: true, manager: true, secondaryManager: true, workExperiences: { orderBy: { fromDate: "desc" } }, educationDetails: { orderBy: { completionDate: "desc" } }, dependents: { orderBy: { name: "asc" } } }
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: { in: ["MANAGER", "HR_ADMIN", "SUPER_ADMIN"] } }, orderBy: { firstName: "asc" } }),
    prisma.attendanceRecord.findMany({ where: { employeeId: params.id }, orderBy: { date: "desc" }, take: 8 }),
    prisma.leaveRequest.findMany({ where: { employeeId: params.id }, include: { leaveType: true }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.leaveBalance.findMany({ where: { employeeId: params.id }, include: { leaveType: true } })
  ]);
  if (!employee) notFound();
  if (!canManageAccountRole(actor.role, employee.role)) notFound();
  return (
    <div className="space-y-6">
      <PageHeader title={`${employee.firstName} ${employee.lastName}`} description="Employee profile, attendance history, leave history, and leave balances." />
      <form action={updateEmployee} className="grid gap-6 md:grid-cols-2">
        <Card className="grid gap-4 md:col-span-2 md:grid-cols-2">
          <div className="md:col-span-2"><h2 className="text-base font-semibold text-ink">Employment and hierarchy</h2></div>
          <input type="hidden" name="id" value={employee.id} />
          <Field label="First name"><Input name="firstName" defaultValue={employee.firstName} required /></Field>
          <Field label="Last name"><Input name="lastName" defaultValue={employee.lastName} required /></Field>
          <Field label="Email"><Input name="email" type="email" defaultValue={employee.email} required /></Field>
          <Field label="Phone"><Input name="phone" defaultValue={employee.phone || ""} /></Field>
          <Field label="Job title"><Input name="jobTitle" defaultValue={employee.jobTitle || ""} /></Field>
          <Field label="Date joined"><Input name="dateJoined" type="date" defaultValue={employee.dateJoined ? employee.dateJoined.toISOString().slice(0, 10) : ""} /></Field>
          <Field label="Role"><Select name="role" defaultValue={employee.role}>{Object.values(Role).map((role) => <option key={role}>{role}</option>)}</Select></Field>
          <Field label="Employment status"><Select name="employmentStatus" defaultValue={employee.employmentStatus}>{Object.values(EmploymentStatus).map((status) => <option key={status}>{status}</option>)}</Select></Field>
          <Field label="Department"><Select name="departmentId" defaultValue={employee.departmentId || ""}><option value="">None</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</Select></Field>
          <Field label="Reporting manager"><Select name="managerId" defaultValue={employee.managerId || ""}><option value="">None</option>{managers.filter((manager) => manager.id !== employee.id).map((manager) => <option key={manager.id} value={manager.id}>{manager.firstName} {manager.lastName}</option>)}</Select></Field>
          <Field label="Secondary reporting manager"><Select name="secondaryManagerId" defaultValue={employee.secondaryManagerId || ""}><option value="">None</option>{managers.filter((manager) => manager.id !== employee.id).map((manager) => <option key={manager.id} value={manager.id}>{manager.firstName} {manager.lastName}</option>)}</Select></Field>
        </Card>
        <EmployeeProfileFields
          personal={{
            dateOfBirth: employee.dateOfBirth?.toISOString().slice(0, 10),
            gender: employee.gender || undefined,
            maritalStatus: employee.maritalStatus || undefined,
            aboutMe: employee.aboutMe || undefined,
            expertise: employee.expertise || undefined
          }}
          workExperiences={employee.workExperiences.map((item) => ({ ...item, fromDate: item.fromDate.toISOString().slice(0, 10), toDate: item.toDate?.toISOString().slice(0, 10) || "", jobDescription: item.jobDescription || "" }))}
          educationDetails={employee.educationDetails.map((item) => ({ ...item, completionDate: item.completionDate?.toISOString().slice(0, 10) || "", specialization: item.specialization || "" }))}
          dependents={employee.dependents.map((item) => ({ ...item, dateOfBirth: item.dateOfBirth?.toISOString().slice(0, 10) || "" }))}
        />
        <div className="md:col-span-2"><Button type="submit">Save changes</Button></div>
      </form>
      {actor.role === Role.SUPER_ADMIN && employee.role !== Role.SUPER_ADMIN ? (
        <Card className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Reset password</h2>
            <p className="mt-1 text-sm text-muted">Users must contact an administrator when they lose access. Set a temporary password and share it securely.</p>
          </div>
          <form action={resetUserPassword} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <input type="hidden" name="userId" value={employee.id} />
            <Field label="New temporary password"><Input name="password" type="password" minLength={12} required /></Field>
            <Button type="submit" variant="secondary">Reset password</Button>
          </form>
        </Card>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {balances.map((balance) => <Card key={balance.id}><p className="font-semibold">{balance.leaveType.name}</p><p className="mt-2 text-2xl font-semibold text-brand">{balance.remainingDays}</p><p className="text-sm text-muted">remaining of {balance.entitlementDays}</p></Card>)}
      </div>
      <Table>
        <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Attendance date</th><th className="px-4 py-3">In</th><th className="px-4 py-3">Out</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Status</th></tr></thead>
        <tbody className="divide-y divide-line">{attendance.map((record) => <tr key={record.id}><td className="px-4 py-3">{formatDate(record.date)}</td><td className="px-4 py-3">{formatTime(record.checkInTime)}</td><td className="px-4 py-3">{formatTime(record.checkOutTime)}</td><td className="px-4 py-3">{compactDuration(record.totalMinutes)}</td><td className="px-4 py-3"><StatusBadge value={record.status} /></td></tr>)}</tbody>
      </Table>
      <Table>
        <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Leave type</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Days</th><th className="px-4 py-3">Status</th></tr></thead>
        <tbody className="divide-y divide-line">{leaveRequests.map((request) => <tr key={request.id}><td className="px-4 py-3">{request.leaveType.name}</td><td className="px-4 py-3">{formatDate(request.startDate)} - {formatDate(request.endDate)}</td><td className="px-4 py-3">{request.totalDays}</td><td className="px-4 py-3"><StatusBadge value={request.status} /></td></tr>)}</tbody>
      </Table>
    </div>
  );
}



