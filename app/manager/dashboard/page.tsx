import { Role } from "@prisma/client";
import { AttendanceActionCard } from "@/components/attendance-action-card";
import { BirthdaysThisMonthCard } from "@/components/birthday-card";
import { DashboardMetricStrip, DashboardSectionHeader } from "@/components/dashboard-overview";
import { TaskDashboardPanel } from "@/components/task-dashboard-panel";
import { Card, EmptyState, LinkButton, PageHeader, StatusBadge, Table } from "@/components/ui";
import { formatDate, formatTime, todayDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function ManagerDashboardPage() {
  const user = await requireUser();
  const today = todayDateOnly();
  const month = new Date().getMonth() + 1;
  const [selfAttendance, teamCount, teamAttendance, teamLeaveToday, pendingLeave, birthdays] = await Promise.all([
    prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId: user.id, date: today } } }),
    prisma.user.count({ where: { managerId: user.id, employmentStatus: "ACTIVE" } }),
    prisma.attendanceRecord.findMany({
      where: { date: today, employee: { managerId: user.id, employmentStatus: "ACTIVE" } },
      include: { employee: true },
      orderBy: { checkInTime: "desc" }
    }),
    prisma.leaveRequest.findMany({
      where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today }, employee: { managerId: user.id, employmentStatus: "ACTIVE" } },
      select: { employeeId: true }
    }),
    prisma.leaveRequest.count({ where: { status: "PENDING", employee: { managerId: user.id } } }),
    prisma.user.findMany({
      where: { employmentStatus: "ACTIVE", dateOfBirth: { not: null }, role: { not: "SUPER_ADMIN" } },
      include: { department: true },
      orderBy: { firstName: "asc" }
    })
  ]);
  const birthdayRows = birthdays.filter((person) => person.dateOfBirth && person.dateOfBirth.getUTCMonth() + 1 === month);
  const nextAction = selfAttendance?.checkInTime && !selfAttendance.checkOutTime ? "check-out" : selfAttendance?.checkInTime && selfAttendance.checkOutTime ? "done" : "check-in";
  const location = selfAttendance?.checkOutPlaceName
    || selfAttendance?.checkInPlaceName
    || (selfAttendance?.checkOutLatitude
      ? `${selfAttendance.checkOutLatitude}, ${selfAttendance.checkOutLongitude}`
      : selfAttendance?.checkInLatitude
        ? `${selfAttendance.checkInLatitude}, ${selfAttendance.checkInLongitude}`
        : undefined);
  const checkedInEmployeeIds = new Set(teamAttendance.filter((row) => row.checkInTime).map((row) => row.employeeId));
  const onLeaveEmployeeIds = new Set(teamLeaveToday.map((request) => request.employeeId));
  const accountedFor = new Set(Array.from(checkedInEmployeeIds).concat(Array.from(onLeaveEmployeeIds)));
  const currentlyCheckedIn = teamAttendance.filter((row) => row.checkInTime && !row.checkOutTime).length;
  const notCheckedIn = Math.max(0, teamCount - accountedFor.size);

  return (
    <div className="space-y-5">
      <PageHeader title={`Good day, ${user.firstName}`} description="Team attendance and items that need your attention." />
      {user.role !== Role.SUPER_ADMIN ? (
        <AttendanceActionCard
          compact
          status={selfAttendance?.status ?? "NOT_CHECKED_IN"}
          nextAction={nextAction}
          lastLocation={location}
          checkedInAt={selfAttendance?.checkInTime?.toISOString()}
          checkedOutAt={selfAttendance?.checkOutTime?.toISOString()}
          totalMinutes={selfAttendance?.totalMinutes}
        />
      ) : null}
      <DashboardMetricStrip metrics={[
        { label: "Team members", value: teamCount, detail: "Active direct reports", href: "/manager/team" },
        { label: "Currently checked in", value: currentlyCheckedIn, detail: "Working now", href: "/manager/attendance?status=CHECKED_IN" },
        { label: "On leave", value: onLeaveEmployeeIds.size, detail: "Approved leave today", href: "/manager/leave-calendar" },
        { label: "Pending approvals", value: pendingLeave, detail: "Requires your decision", href: "/manager/leave-approvals", attention: pendingLeave > 0 }
      ]} />
      <TaskDashboardPanel user={{ id: user.id, role: user.role }} scope="team" />
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <section className="min-w-0 space-y-3">
          <DashboardSectionHeader title="Team attendance" description="The latest six check-ins for today." href="/manager/attendance" linkLabel="View full attendance" />
          {teamAttendance.length ? (
            <Table>
              <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Check in</th><th className="px-4 py-3">Check out</th><th className="px-4 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-line">
                {teamAttendance.slice(0, 6).map((record) => (
                  <tr key={record.id}><td className="px-4 py-3">{record.employee.firstName} {record.employee.lastName}</td><td className="px-4 py-3">{formatDate(record.date)}</td><td className="px-4 py-3">{formatTime(record.checkInTime)}</td><td className="px-4 py-3">{formatTime(record.checkOutTime)}</td><td className="px-4 py-3"><StatusBadge value={record.status} /></td></tr>
                ))}
              </tbody>
            </Table>
          ) : <Card><EmptyState title="No team check-ins yet" description="Today’s team attendance will appear here." /></Card>}
        </section>
        <div className="space-y-5">
          <Card className="space-y-4">
            <div>
              <h2 className="font-semibold text-ink">Needs attention</h2>
              <p className="mt-0.5 text-sm text-muted">Items that may require follow-up.</p>
            </div>
            <div className="divide-y divide-line rounded-xl border border-line">
              <div className="flex items-center justify-between gap-4 p-3"><div><p className="text-sm font-semibold text-ink">Leave approvals</p><p className="text-xs text-muted">Awaiting your decision</p></div><span className="text-xl font-semibold text-warning">{pendingLeave}</span></div>
              <div className="flex items-center justify-between gap-4 p-3"><div><p className="text-sm font-semibold text-ink">Not checked in</p><p className="text-xs text-muted">Excludes approved leave</p></div><span className="text-xl font-semibold text-ink">{notCheckedIn}</span></div>
            </div>
            <LinkButton href="/manager/leave-approvals" variant="secondary" className="w-full">Review approvals</LinkButton>
          </Card>
          <BirthdaysThisMonthCard birthdays={birthdayRows} limit={3} />
        </div>
      </div>
    </div>
  );
}



