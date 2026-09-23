import { Role } from "@prisma/client";
import { AttendanceExperience } from "@/components/attendance-experience";
import { AttendanceLiveRefresh } from "@/components/attendance-live-refresh";
import { BirthdaysThisMonthCard } from "@/components/birthday-card";
import { DashboardMetricStrip } from "@/components/dashboard-overview";
import { PageHeader } from "@/components/ui";
import { formatDate, todayDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function AdminDashboardPage() {
  const actor = await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const today = todayDateOnly();
  const [selfAttendance, totalEmployees, currentlyCheckedIn, pendingReview, onLeave, birthdays] = await Promise.all([
    actor.role === Role.SUPER_ADMIN ? Promise.resolve(null) : prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId: actor.id, date: today } } }),
    prisma.user.count({ where: { employmentStatus: "ACTIVE", role: { not: Role.SUPER_ADMIN } } }),
    prisma.attendanceRecord.count({ where: { date: today, checkInTime: { not: null }, checkOutTime: null, employee: { employmentStatus: "ACTIVE", role: { not: Role.SUPER_ADMIN } } } }),
    prisma.attendanceRecord.count({ where: { date: today, requiresReview: true } }),
    prisma.leaveRequest.count({ where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } } }),
    prisma.user.findMany({
      where: { employmentStatus: "ACTIVE", dateOfBirth: { not: null }, role: { not: Role.SUPER_ADMIN } },
      select: { id: true, firstName: true, lastName: true, dateOfBirth: true, department: { select: { name: true } } },
      orderBy: { firstName: "asc" }
    })
  ]);
  const birthdayRows = birthdays.filter((person) => person.dateOfBirth?.getUTCMonth() === today.getUTCMonth());
  const nextAction = selfAttendance?.checkInTime ? selfAttendance.checkOutTime ? "done" : "check-out" : "check-in";
  const attendanceState = selfAttendance?.checkOutTime ? "checked-out" : selfAttendance?.checkInTime ? "checked-in" : "before-check-in";
  const location = selfAttendance?.checkOutPlaceName || selfAttendance?.checkInPlaceName
    || (selfAttendance?.checkOutLatitude != null ? `${selfAttendance.checkOutLatitude}, ${selfAttendance.checkOutLongitude}`
      : selfAttendance?.checkInLatitude != null ? `${selfAttendance.checkInLatitude}, ${selfAttendance.checkInLongitude}` : undefined);

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${actor.firstName}`} description={formatDate(today)} action={<AttendanceLiveRefresh />} />
      <DashboardMetricStrip metrics={[
        { label: "Active employees", value: totalEmployees },
        { label: "Currently checked in", value: currentlyCheckedIn },
        { label: "On leave today", value: onLeave },
        { label: "Pending review today", value: pendingReview, attention: pendingReview > 0 }
      ]} />
      {actor.role !== Role.SUPER_ADMIN ? (
        <AttendanceExperience attendanceState={attendanceState}
          status={selfAttendance?.status ?? "NOT_CHECKED_IN"} nextAction={nextAction}
          lastLocation={location} checkedInAt={selfAttendance?.checkInTime?.toISOString()}
          checkedOutAt={selfAttendance?.checkOutTime?.toISOString()} totalMinutes={selfAttendance?.totalMinutes} />
      ) : null}
      {birthdayRows.length > 0 ? <div className="max-w-md"><BirthdaysThisMonthCard birthdays={birthdayRows} limit={3} /></div> : null}
    </div>
  );
}
