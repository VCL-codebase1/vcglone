import { Role } from "@prisma/client";
import { AttendanceExperience } from "@/components/attendance-experience";
import { BirthdaysThisMonthCard } from "@/components/birthday-card";
import { PageHeader } from "@/components/ui";
import { formatDate, todayDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function ManagerDashboardPage() {
  const user = await requireUser();
  const today = todayDateOnly();
  const [selfAttendance, birthdays] = await Promise.all([
    prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId: user.id, date: today } } }),
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
      <PageHeader title={`Welcome back, ${user.firstName}`} description={formatDate(today)} />
      {user.role !== Role.SUPER_ADMIN ? (
        <AttendanceExperience attendanceState={attendanceState}
          status={selfAttendance?.status ?? "NOT_CHECKED_IN"} nextAction={nextAction}
          lastLocation={location} checkedInAt={selfAttendance?.checkInTime?.toISOString()}
          checkedOutAt={selfAttendance?.checkOutTime?.toISOString()} totalMinutes={selfAttendance?.totalMinutes} />
      ) : null}
      {birthdayRows.length > 0 ? <div className="max-w-md"><BirthdaysThisMonthCard birthdays={birthdayRows} limit={3} /></div> : null}
    </div>
  );
}



