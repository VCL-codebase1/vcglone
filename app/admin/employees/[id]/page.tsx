import { EmploymentStatus, Role } from "@prisma/client";
import { notFound } from "next/navigation";
import { updateEmployee } from "@/lib/actions";
import { compactDuration, formatDate, formatTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { Button, Card, Field, Input, PageHeader, Select, StatusBadge, Table } from "@/components/ui";

export const runtime = "nodejs";

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const [employee, departments, managers, attendance, leaveRequests, balances] = await Promise.all([
    prisma.user.findUnique({ where: { id: params.id }, include: { department: true, manager: true } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: { in: ["MANAGER", "HR_ADMIN", "SUPER_ADMIN"] } }, orderBy: { firstName: "asc" } }),
    prisma.attendanceRecord.findMany({ where: { employeeId: params.id }, orderBy: { date: "desc" }, take: 8 }),
    prisma.leaveRequest.findMany({ where: { employeeId: params.id }, include: { leaveType: true }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.leaveBalance.findMany({ where: { employeeId: params.id }, include: { leaveType: true } })
  ]);
  if (!employee) notFound();
  return (
    <div className="space-y-6">
      <PageHeader title={`${employee.firstName} ${employee.lastName}`} description="Employee profile, attendance history, leave history, and leave balances." />
      <Card>
        <form action={updateEmployee} className="grid gap-4 md:grid-cols-2">
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
          <Field label="Manager"><Select name="managerId" defaultValue={employee.managerId || ""}><option value="">None</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.firstName} {manager.lastName}</option>)}</Select></Field>
          <div className="md:col-span-2"><Button type="submit">Save changes</Button></div>
        </form>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
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
