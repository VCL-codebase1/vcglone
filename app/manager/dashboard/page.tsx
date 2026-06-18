import { PageHeader, StatCard, StatusBadge, Table } from "@/components/ui";
import { formatDate, formatTime, todayDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function ManagerDashboardPage() {
  const user = await requireUser();
  const today = todayDateOnly();
  const [teamCount, teamAttendance, pendingLeave] = await Promise.all([
    prisma.user.count({ where: { managerId: user.id, employmentStatus: "ACTIVE" } }),
    prisma.attendanceRecord.findMany({
      where: { date: today, employee: { managerId: user.id } },
      include: { employee: true },
      orderBy: { checkInTime: "desc" }
    }),
    prisma.leaveRequest.count({ where: { status: "PENDING", employee: { managerId: user.id } } })
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Manager Dashboard" description="Team attendance visibility and pending leave approvals." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Team members" value={teamCount} />
        <StatCard label="Checked in today" value={teamAttendance.filter((row) => row.checkInTime).length} />
        <StatCard label="Pending approvals" value={pendingLeave} />
      </div>
      <Table>
        <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Check in</th><th className="px-4 py-3">Check out</th><th className="px-4 py-3">Status</th></tr></thead>
        <tbody className="divide-y divide-line">
          {teamAttendance.map((record) => (
            <tr key={record.id}><td className="px-4 py-3">{record.employee.firstName} {record.employee.lastName}</td><td className="px-4 py-3">{formatDate(record.date)}</td><td className="px-4 py-3">{formatTime(record.checkInTime)}</td><td className="px-4 py-3">{formatTime(record.checkOutTime)}</td><td className="px-4 py-3"><StatusBadge value={record.status} /></td></tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
