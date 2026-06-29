import { Role } from "@prisma/client";
import { AttendanceActionCard } from "@/components/attendance-action-card";
import { BirthdaysThisMonthCard } from "@/components/birthday-card";
import { TodayAttendanceDataTable } from "@/components/dashboard-tables";
import { SystemPulse } from "@/components/system-pulse";
import { PageHeader, StatCard } from "@/components/ui";
import { formatTime, todayDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function AdminDashboardPage() {
  const actor = await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const today = todayDateOnly();
  const month = new Date().getMonth() + 1;
  const [selfAttendance, totalEmployees, checkedIn, checkedOut, pendingReview, onLeave, pendingLeave, todayAttendance, birthdays] = await Promise.all([
    prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId: actor.id, date: today } } }),
    prisma.user.count({ where: { employmentStatus: "ACTIVE" } }),
    prisma.attendanceRecord.count({ where: { date: today, checkInTime: { not: null } } }),
    prisma.attendanceRecord.count({ where: { date: today, checkOutTime: { not: null } } }),
    prisma.attendanceRecord.count({ where: { requiresReview: true } }),
    prisma.leaveRequest.count({ where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } } }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.attendanceRecord.findMany({ where: { date: today }, include: { employee: true }, orderBy: { checkInTime: "desc" }, take: 10 }),
    prisma.user.findMany({
      where: { employmentStatus: "ACTIVE", dateOfBirth: { not: null }, role: { not: "SUPER_ADMIN" } },
      include: { department: true },
      orderBy: { firstName: "asc" }
    })
  ]);
  const birthdayRows = birthdays.filter((person) => person.dateOfBirth && person.dateOfBirth.getUTCMonth() + 1 === month);
  const todayAttendanceRows = todayAttendance.map((record) => ({
    employee: `${record.employee.firstName} ${record.employee.lastName}`,
    checkIn: formatTime(record.checkInTime),
    checkOut: formatTime(record.checkOutTime),
    status: record.status
  }));
  const nextAction = selfAttendance?.checkInTime && !selfAttendance.checkOutTime ? "check-out" : selfAttendance?.checkInTime && selfAttendance.checkOutTime ? "done" : "check-in";
  const location = selfAttendance?.checkOutPlaceName
    || selfAttendance?.checkInPlaceName
    || (selfAttendance?.checkOutLatitude
      ? `${selfAttendance.checkOutLatitude}, ${selfAttendance.checkOutLongitude}`
      : selfAttendance?.checkInLatitude
        ? `${selfAttendance.checkInLatitude}, ${selfAttendance.checkInLongitude}`
        : undefined);

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Dashboard" description="Organization-wide attendance, leave, and workforce operations overview." action={<SystemPulse />} />
      {actor.role !== Role.SUPER_ADMIN ? (
        <AttendanceActionCard
          nextAction={nextAction}
          lastLocation={location}
          checkedInAt={selfAttendance?.checkInTime?.toISOString()}
          checkedOutAt={selfAttendance?.checkOutTime?.toISOString()}
          totalMinutes={selfAttendance?.totalMinutes}
        />
      ) : null}
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
        <BirthdaysThisMonthCard birthdays={birthdayRows} />
      </div>
    </div>
  );
}



