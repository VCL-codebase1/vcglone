import { format, subDays } from "date-fns";
import { AttendanceTrendChart } from "@/components/dashboard-charts";
import { TodayAttendanceDataTable } from "@/components/dashboard-tables";
import { SystemPulse } from "@/components/system-pulse";
import { PageHeader, StatCard, Table } from "@/components/ui";
import { formatDateTime, formatTime, todayDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export default async function AdminDashboardPage() {
  const today = todayDateOnly();
  const [totalEmployees, checkedIn, checkedOut, pendingReview, onLeave, pendingLeave, todayAttendance, recentAudit, attendanceTrend] = await Promise.all([
    prisma.user.count({ where: { employmentStatus: "ACTIVE" } }),
    prisma.attendanceRecord.count({ where: { date: today, checkInTime: { not: null } } }),
    prisma.attendanceRecord.count({ where: { date: today, checkOutTime: { not: null } } }),
    prisma.attendanceRecord.count({ where: { requiresReview: true } }),
    prisma.leaveRequest.count({ where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } } }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.attendanceRecord.findMany({ where: { date: today }, include: { employee: true }, orderBy: { checkInTime: "desc" }, take: 10 }),
    prisma.auditLog.findMany({ include: { actor: true }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.attendanceRecord.groupBy({
      by: ["date"],
      where: { date: { gte: subDays(today, 6), lte: today } },
      _count: { _all: true },
      orderBy: { date: "asc" }
    })
  ]);
  const trendData = Array.from({ length: 7 }, (_, index) => {
    const date = subDays(today, 6 - index);
    const match = attendanceTrend.find((item) => item.date.getTime() === date.getTime());
    return { label: format(date, "MMM d"), attendance: match?._count._all ?? 0 };
  });
  const todayAttendanceRows = todayAttendance.map((record) => ({
    employee: `${record.employee.firstName} ${record.employee.lastName}`,
    checkIn: formatTime(record.checkInTime),
    checkOut: formatTime(record.checkOutTime),
    status: record.status
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Dashboard" description="Organization-wide attendance, leave, and workforce operations overview." action={<SystemPulse />} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total employees" value={totalEmployees} />
        <StatCard label="Checked in today" value={checkedIn} />
        <StatCard label="Checked out today" value={checkedOut} />
        <StatCard label="Pending review" value={pendingReview} />
        <StatCard label="On leave today" value={onLeave} />
        <StatCard label="Pending leave approvals" value={pendingLeave} />
        <StatCard label="Present today" value={checkedIn} detail="Late policy calculation can be enabled later." />
        <StatCard label="Late count" value={0} detail="Work policy placeholder" />
      </div>
      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <section className="min-w-0 space-y-3">
          <h2 className="font-semibold text-ink">Today&apos;s attendance</h2>
          <TodayAttendanceDataTable data={todayAttendanceRows} />
        </section>
        <section className="min-w-0 space-y-3">
          <h2 className="font-semibold text-ink">Recent activity</h2>
          <Table>
            <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Action</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Time</th></tr></thead>
            <tbody className="divide-y divide-line">
              {recentAudit.map((log) => (
                <tr key={log.id}><td className="px-4 py-3">{log.action.replace(/_/g, " ")}</td><td className="px-4 py-3">{log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : "System"}</td><td className="px-4 py-3">{formatDateTime(log.createdAt)}</td></tr>
              ))}
            </tbody>
          </Table>
        </section>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-4 shadow-soft sm:p-6"><h3 className="font-semibold text-ink">Attendance trend</h3><p className="mt-2 text-sm text-muted">Daily attendance records over the last seven days.</p><div className="mt-4"><AttendanceTrendChart data={trendData} /></div></div>
        <div className="rounded-lg border border-dashed border-line bg-white p-4 sm:p-6"><h3 className="font-semibold text-ink">Department attendance summary</h3><p className="mt-2 text-sm text-muted">Placeholder for department-level analytics.</p></div>
      </div>
    </div>
  );
}



