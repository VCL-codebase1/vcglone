import { Role } from "@prisma/client";
import { AttendanceActionCard } from "@/components/attendance-action-card";
import { AttendanceLiveRefresh } from "@/components/attendance-live-refresh";
import { BirthdaysThisMonthCard } from "@/components/birthday-card";
import { DashboardMetricStrip, DashboardSectionHeader } from "@/components/dashboard-overview";
import { TodayAttendanceDataTable } from "@/components/dashboard-tables";
import { SystemPulse } from "@/components/system-pulse";
import { TaskDashboardPanel } from "@/components/task-dashboard-panel";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { formatTime, todayDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function AdminDashboardPage() {
  const actor = await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const today = todayDateOnly();
  const month = new Date().getMonth() + 1;
  const [selfAttendance, totalEmployees, pendingReview, onLeave, pendingLeave, todayAttendance, todayLeave, birthdays] = await Promise.all([
    prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId: actor.id, date: today } } }),
    prisma.user.count({ where: { employmentStatus: "ACTIVE", role: { not: Role.SUPER_ADMIN } } }),
    prisma.attendanceRecord.count({ where: { requiresReview: true } }),
    prisma.leaveRequest.count({ where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } } }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.attendanceRecord.findMany({ where: { date: today, employee: { employmentStatus: "ACTIVE", role: { not: Role.SUPER_ADMIN } } }, include: { employee: true }, orderBy: { checkInTime: "desc" } }),
    prisma.leaveRequest.findMany({
      where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today }, employee: { employmentStatus: "ACTIVE", role: { not: Role.SUPER_ADMIN } } },
      include: { employee: true, leaveType: true },
      orderBy: { employee: { firstName: "asc" } }
    }),
    prisma.user.findMany({
      where: { employmentStatus: "ACTIVE", dateOfBirth: { not: null }, role: { not: "SUPER_ADMIN" } },
      include: { department: true },
      orderBy: { firstName: "asc" }
    })
  ]);
  const birthdayRows = birthdays.filter((person) => person.dateOfBirth && person.dateOfBirth.getUTCMonth() + 1 === month);
  const leaveByEmployee = new Map(todayLeave.map((request) => [request.employeeId, request]));
  const attendanceEmployeeIds = new Set(todayAttendance.map((record) => record.employeeId));
  const todayAttendanceRows = [
    ...todayAttendance.map((record) => {
      const leaveStatus = leaveByEmployee.get(record.employeeId)?.leaveType.name;
      return {
        employee: `${record.employee.firstName} ${record.employee.lastName}`,
        checkIn: formatTime(record.checkInTime),
        checkOut: formatTime(record.checkOutTime),
        status: leaveStatus || record.status,
        attendanceStatus: leaveStatus ? record.status : undefined
      };
    }),
    ...todayLeave
      .filter((request) => !attendanceEmployeeIds.has(request.employeeId))
      .map((request) => ({
        employee: `${request.employee.firstName} ${request.employee.lastName}`,
        checkIn: "-",
        checkOut: "-",
        status: request.leaveType.name
      }))
  ];
  const nextAction = selfAttendance?.checkInTime && !selfAttendance.checkOutTime ? "check-out" : selfAttendance?.checkInTime && selfAttendance.checkOutTime ? "done" : "check-in";
  const currentlyCheckedIn = todayAttendance.filter((record) => record.checkInTime && !record.checkOutTime).length;
  const checkedOutToday = todayAttendance.filter((record) => record.checkOutTime).length;
  const location = selfAttendance?.checkOutPlaceName
    || selfAttendance?.checkInPlaceName
    || (selfAttendance?.checkOutLatitude
      ? `${selfAttendance.checkOutLatitude}, ${selfAttendance.checkOutLongitude}`
      : selfAttendance?.checkInLatitude
        ? `${selfAttendance.checkInLatitude}, ${selfAttendance.checkInLongitude}`
        : undefined);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Admin Dashboard"
        description="Organization-wide attendance, leave, and workforce operations overview. Attendance updates automatically."
        action={(
          <div className="flex flex-col gap-2 sm:flex-row">
            <AttendanceLiveRefresh />
            <SystemPulse />
          </div>
        )}
      />
      {actor.role !== Role.SUPER_ADMIN ? (
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
        { label: "Active employees", value: totalEmployees, detail: "Organization-wide", href: "/admin/employees" },
        { label: "Currently checked in", value: currentlyCheckedIn, detail: `${checkedOutToday} checked out today`, href: "/admin/today-attendance?status=checked-in" },
        { label: "On leave", value: onLeave, detail: "Approved leave today", href: "/admin/leave-requests?status=APPROVED" },
        { label: "Pending review", value: pendingReview, detail: "Attendance exceptions", href: "/admin/attendance?location=missing", attention: pendingReview > 0 }
      ]} />
      <TaskDashboardPanel user={{ id: actor.id, role: actor.role }} scope="organization" />
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <section className="min-w-0 space-y-3">
          <DashboardSectionHeader title="Today’s attendance" description="The latest eight attendance updates." href="/admin/today-attendance" linkLabel="View full attendance" />
          {todayAttendanceRows.length ? <TodayAttendanceDataTable data={todayAttendanceRows.slice(0, 8)} /> : <Card><EmptyState title="No attendance activity yet" description="Today’s check-ins and approved leave will appear here." /></Card>}
        </section>
        <div className="space-y-5">
          <Card className="space-y-4">
            <div>
              <h2 className="font-semibold text-ink">Needs attention</h2>
              <p className="mt-0.5 text-sm text-muted">Open items requiring an HR decision.</p>
            </div>
            <div className="divide-y divide-line rounded-xl border border-line">
              <div className="flex items-center justify-between gap-4 p-3"><div><p className="text-sm font-semibold text-ink">Attendance reviews</p><p className="text-xs text-muted">Missing location or exception</p></div><span className="text-xl font-semibold text-warning">{pendingReview}</span></div>
              <div className="flex items-center justify-between gap-4 p-3"><div><p className="text-sm font-semibold text-ink">Leave approvals</p><p className="text-xs text-muted">Awaiting HR decision</p></div><span className="text-xl font-semibold text-warning">{pendingLeave}</span></div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <LinkButton href="/admin/attendance?location=missing" variant="secondary">Review attendance</LinkButton>
              <LinkButton href="/admin/leave-requests?status=PENDING" variant="secondary">Review leave</LinkButton>
            </div>
          </Card>
          <BirthdaysThisMonthCard birthdays={birthdayRows} limit={3} />
        </div>
      </div>
    </div>
  );
}



