import { Role } from "@prisma/client";
import { AttendanceActionCard } from "@/components/attendance-action-card";
import { BirthdaysThisMonthCard } from "@/components/birthday-card";
import { DashboardMetricStrip } from "@/components/dashboard-overview";
import { PageHeader } from "@/components/ui";
import { formatDate, todayDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function ManagerDashboardPage() {
  const user = await requireUser();
  const today = todayDateOnly();
  const [selfAttendance, teamCount, currentlyCheckedIn, teamLeaveToday, pendingLeave, birthdays] = await Promise.all([
    prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId: user.id, date: today } } }),
    prisma.user.count({ where: { managerId: user.id, employmentStatus: "ACTIVE" } }),
    prisma.attendanceRecord.count({
      where: { date: today, checkInTime: { not: null }, checkOutTime: null, employee: { managerId: user.id, employmentStatus: "ACTIVE" } }
    }),
    prisma.leaveRequest.findMany({
      where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today }, employee: { managerId: user.id, employmentStatus: "ACTIVE" } },
      select: { employeeId: true }
    }),
    prisma.leaveRequest.count({ where: { status: "PENDING", employee: { managerId: user.id } } }),
    prisma.user.findMany({
      where: { employmentStatus: "ACTIVE", dateOfBirth: { not: null }, role: { not: Role.SUPER_ADMIN } },
      select: { id: true, firstName: true, lastName: true, dateOfBirth: true, department: { select: { name: true } } },
      orderBy: { firstName: "asc" }
    })
  ]);
  const birthdayRows = birthdays.filter((person) => person.dateOfBirth?.getUTCMonth() === today.getUTCMonth());
  const nextAction = selfAttendance?.checkInTime ? selfAttendance.checkOutTime ? "done" : "check-out" : "check-in";
  const location = selfAttendance?.checkOutPlaceName || selfAttendance?.checkInPlaceName
    || (selfAttendance?.checkOutLatitude != null ? `${selfAttendance.checkOutLatitude}, ${selfAttendance.checkOutLongitude}`
      : selfAttendance?.checkInLatitude != null ? `${selfAttendance.checkInLatitude}, ${selfAttendance.checkInLongitude}` : undefined);

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${user.firstName}`} description={formatDate(today)} />
      <DashboardMetricStrip metrics={[
        { label: "Team members", value: teamCount },
        { label: "Currently checked in", value: currentlyCheckedIn },
        { label: "On leave today", value: new Set(teamLeaveToday.map((request) => request.employeeId)).size },
        { label: "Pending approvals", value: pendingLeave, attention: pendingLeave > 0 }
      ]} />
      {user.role !== Role.SUPER_ADMIN ? (
        <AttendanceActionCard status={selfAttendance?.status ?? "NOT_CHECKED_IN"} nextAction={nextAction}
          lastLocation={location} checkedInAt={selfAttendance?.checkInTime?.toISOString()}
          checkedOutAt={selfAttendance?.checkOutTime?.toISOString()} totalMinutes={selfAttendance?.totalMinutes} />
      ) : null}
      {birthdayRows.length > 0 ? <div className="max-w-md"><BirthdaysThisMonthCard birthdays={birthdayRows} limit={3} /></div> : null}
    </div>
  );
}



