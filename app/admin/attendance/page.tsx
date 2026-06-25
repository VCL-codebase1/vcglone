import Link from "next/link";
import { AttendanceStatus } from "@prisma/client";
import { LinkButton, PageHeader, StatusBadge, Table } from "@/components/ui";
import { compactDuration, formatDate, formatTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export default async function AdminAttendancePage({ searchParams }: { searchParams: { from?: string; to?: string; status?: string; location?: string; employee?: string; department?: string } }) {
  const [records, employees, departments] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        employeeId: searchParams.employee || undefined,
        status: searchParams.status ? (searchParams.status as AttendanceStatus) : undefined,
        requiresReview: searchParams.location === "missing" ? true : undefined,
        employee: { departmentId: searchParams.department || undefined },
        date: { gte: searchParams.from ? new Date(searchParams.from) : undefined, lte: searchParams.to ? new Date(searchParams.to) : undefined }
      },
      include: { employee: { include: { department: true } } },
      orderBy: { date: "desc" },
      take: 200
    }),
    prisma.user.findMany({ orderBy: { firstName: "asc" }, select: { id: true, firstName: true, lastName: true } }),
    prisma.department.findMany({ orderBy: { name: "asc" } })
  ]);
  const query = new URLSearchParams(searchParams as Record<string, string>).toString();
  return (
    <div className="space-y-6">
      <PageHeader title="Attendance Records" description="Review, filter, export, and manually adjust employee attendance." action={<LinkButton href={`/api/reports/attendance?${query}`} variant="secondary">Export CSV</LinkButton>} />
      <form className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <input className="w-full min-w-0 rounded-md border border-line px-3 py-2 text-sm" type="date" name="from" defaultValue={searchParams.from} />
        <input className="w-full min-w-0 rounded-md border border-line px-3 py-2 text-sm" type="date" name="to" defaultValue={searchParams.to} />
        <select className="w-full min-w-0 rounded-md border border-line px-3 py-2 text-sm" name="employee" defaultValue={searchParams.employee || ""}><option value="">All employees</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}</select>
        <select className="w-full min-w-0 rounded-md border border-line px-3 py-2 text-sm" name="department" defaultValue={searchParams.department || ""}><option value="">All departments</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>
        <select className="w-full min-w-0 rounded-md border border-line px-3 py-2 text-sm" name="status" defaultValue={searchParams.status || ""}><option value="">All statuses</option>{Object.values(AttendanceStatus).map((status) => <option key={status}>{status}</option>)}</select>
        <button className="min-h-10 w-full rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">Filter</button>
      </form>
      <Table>
        <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">In</th><th className="px-4 py-3">Out</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Status</th></tr></thead>
        <tbody className="divide-y divide-line">
          {records.map((record) => <tr key={record.id} className={record.requiresReview ? "bg-amber-50/50" : ""}><td className="px-4 py-3 font-medium"><Link href={`/admin/attendance/${record.id}`} className="text-brand hover:underline">{record.employee.firstName} {record.employee.lastName}</Link></td><td className="px-4 py-3">{record.employee.department?.name || "-"}</td><td className="px-4 py-3">{formatDate(record.date)}</td><td className="px-4 py-3">{formatTime(record.checkInTime)}</td><td className="px-4 py-3">{formatTime(record.checkOutTime)}</td><td className="px-4 py-3">{compactDuration(record.totalMinutes)}</td><td className="max-w-xs px-4 py-3 text-muted">{record.checkOutPlaceName || record.checkInPlaceName || (record.checkInLatitude || record.checkOutLatitude ? "Captured" : "Missing")}</td><td className="px-4 py-3"><StatusBadge value={record.status} /></td></tr>)}
        </tbody>
      </Table>
    </div>
  );
}



