import { PageHeader, StatCard, StatusBadge, Table } from "@/components/ui";
import { formatDateTime, formatTime, todayDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export default async function AdminDashboardPage() {
  const today = todayDateOnly();
  const [totalEmployees, checkedIn, checkedOut, pendingReview, onLeave, pendingLeave, todayAttendance, recentAudit] = await Promise.all([
    prisma.user.count({ where: { employmentStatus: "ACTIVE" } }),
    prisma.attendanceRecord.count({ where: { date: today, checkInTime: { not: null } } }),
    prisma.attendanceRecord.count({ where: { date: today, checkOutTime: { not: null } } }),
    prisma.attendanceRecord.count({ where: { requiresReview: true } }),
    prisma.leaveRequest.count({ where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } } }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.attendanceRecord.findMany({ where: { date: today }, include: { employee: true }, orderBy: { checkInTime: "desc" }, take: 10 }),
    prisma.auditLog.findMany({ include: { actor: true }, orderBy: { createdAt: "desc" }, take: 8 })
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Dashboard" description="Organization-wide attendance, leave, and workforce operations overview." />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total employees" value={totalEmployees} />
        <StatCard label="Checked in today" value={checkedIn} />
        <StatCard label="Checked out today" value={checkedOut} />
        <StatCard label="Pending review" value={pendingReview} />
        <StatCard label="On leave today" value={onLeave} />
        <StatCard label="Pending leave approvals" value={pendingLeave} />
        <StatCard label="Present today" value={checkedIn} detail="Late policy calculation can be enabled later." />
        <StatCard label="Late count" value={0} detail="Work policy placeholder" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-semibold text-ink">Today’s attendance</h2>
          <Table>
            <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">In</th><th className="px-4 py-3">Out</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-line">
              {todayAttendance.map((record) => (
                <tr key={record.id}><td className="px-4 py-3">{record.employee.firstName} {record.employee.lastName}</td><td className="px-4 py-3">{formatTime(record.checkInTime)}</td><td className="px-4 py-3">{formatTime(record.checkOutTime)}</td><td className="px-4 py-3"><StatusBadge value={record.status} /></td></tr>
              ))}
            </tbody>
          </Table>
        </section>
        <section className="space-y-3">
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
        <div className="rounded-lg border border-dashed border-line bg-white p-6"><h3 className="font-semibold text-ink">Monthly attendance trend</h3><p className="mt-2 text-sm text-muted">Placeholder for chart integration once historical volume is available.</p></div>
        <div className="rounded-lg border border-dashed border-line bg-white p-6"><h3 className="font-semibold text-ink">Department attendance summary</h3><p className="mt-2 text-sm text-muted">Placeholder for department-level analytics.</p></div>
      </div>
    </div>
  );
}
