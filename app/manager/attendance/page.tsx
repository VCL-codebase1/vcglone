import { AttendanceStatus } from "@prisma/client";
import { PageHeader, StatusBadge, Table } from "@/components/ui";
import { compactDuration, formatDate, formatTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function ManagerAttendancePage({ searchParams }: { searchParams: { from?: string; to?: string; status?: string } }) {
  const user = await requireUser();
  const records = await prisma.attendanceRecord.findMany({
    where: {
      employee: { managerId: user.id },
      status: searchParams.status ? (searchParams.status as AttendanceStatus) : undefined,
      date: { gte: searchParams.from ? new Date(searchParams.from) : undefined, lte: searchParams.to ? new Date(searchParams.to) : undefined }
    },
    include: { employee: true },
    orderBy: { date: "desc" },
    take: 100
  });
  return (
    <div className="space-y-6">
      <PageHeader title="Team Attendance" description="Attendance records for assigned team members." />
      <form className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-soft md:grid-cols-4">
        <input className="rounded-md border border-line px-3 py-2 text-sm" type="date" name="from" defaultValue={searchParams.from} />
        <input className="rounded-md border border-line px-3 py-2 text-sm" type="date" name="to" defaultValue={searchParams.to} />
        <select className="rounded-md border border-line px-3 py-2 text-sm" name="status" defaultValue={searchParams.status || ""}><option value="">All statuses</option><option value="CHECKED_IN">Checked in</option><option value="CHECKED_OUT">Checked out</option><option value="PENDING_REVIEW">Pending review</option></select>
        <button className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">Filter</button>
      </form>
      <Table>
        <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">In</th><th className="px-4 py-3">Out</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Status</th></tr></thead>
        <tbody className="divide-y divide-line">
          {records.map((record) => (
            <tr key={record.id}><td className="px-4 py-3">{record.employee.firstName} {record.employee.lastName}</td><td className="px-4 py-3">{formatDate(record.date)}</td><td className="px-4 py-3">{formatTime(record.checkInTime)}</td><td className="px-4 py-3">{formatTime(record.checkOutTime)}</td><td className="px-4 py-3">{compactDuration(record.totalMinutes)}</td><td className="px-4 py-3">{record.checkInLatitude ? "Captured" : "Missing"}</td><td className="px-4 py-3"><StatusBadge value={record.status} /></td></tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
