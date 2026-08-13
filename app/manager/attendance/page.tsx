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
      <form className="workspace-toolbar grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <input className="focus-ring min-h-11 w-full min-w-0 rounded-full border border-transparent bg-surface px-4 text-sm" type="date" name="from" defaultValue={searchParams.from} />
        <input className="focus-ring min-h-11 w-full min-w-0 rounded-full border border-transparent bg-surface px-4 text-sm" type="date" name="to" defaultValue={searchParams.to} />
        <select className="focus-ring min-h-11 w-full min-w-0 rounded-full border border-transparent bg-surface px-4 text-sm" name="status" defaultValue={searchParams.status || ""}><option value="">All statuses</option><option value="CHECKED_IN">Checked in</option><option value="CHECKED_OUT">Checked out</option><option value="PENDING_REVIEW">Pending review</option></select>
        <button className="min-h-11 w-full rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(36,58,121,0.16)]">Filter</button>
      </form>
      <Table>
        <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">In</th><th className="px-4 py-3">Out</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Status</th></tr></thead>
        <tbody className="divide-y divide-line">
          {records.map((record) => (
            <tr key={record.id}><td className="px-4 py-3">{record.employee.firstName} {record.employee.lastName}</td><td className="px-4 py-3">{formatDate(record.date)}</td><td className="px-4 py-3">{formatTime(record.checkInTime)}</td><td className="px-4 py-3">{formatTime(record.checkOutTime)}</td><td className="px-4 py-3">{compactDuration(record.totalMinutes)}</td><td className="max-w-xs px-4 py-3 text-muted">{record.checkOutPlaceName || record.checkInPlaceName || (record.checkInLatitude || record.checkOutLatitude ? "Captured" : "Missing")}</td><td className="px-4 py-3"><StatusBadge value={record.status} /></td></tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}



