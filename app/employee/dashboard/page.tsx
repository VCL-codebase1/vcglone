import { BirthdaysThisMonthCard } from "@/components/birthday-card";
import { EmployeeAttendanceExperience } from "@/components/employee-attendance-experience";
import { PageHeader } from "@/components/ui";
import { formatDate, todayDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function EmployeeDashboardPage() {
  const user = await requireUser();
  const today = todayDateOnly();
  const [record, leaveToday, birthdays] = await Promise.all([
    prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId: user.id, date: today } } }),
    prisma.leaveRequest.findFirst({
      where: { employeeId: user.id, status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } },
      select: { id: true }
    }),
    prisma.user.findMany({
      where: { employmentStatus: "ACTIVE", dateOfBirth: { not: null }, role: { not: "SUPER_ADMIN" } },
      select: { id: true, firstName: true, lastName: true, dateOfBirth: true, department: { select: { name: true } } },
      orderBy: { firstName: "asc" }
    })
  ]);
  const birthdayRows = birthdays.filter((person) => person.dateOfBirth?.getUTCMonth() === today.getUTCMonth());
  const nextAction = record?.checkInTime ? record.checkOutTime ? "done" : "check-out" : "check-in";
  const attendanceState = record?.checkOutTime ? "checked-out" : record?.checkInTime ? "checked-in" : "before-check-in";
  const location = record?.checkOutPlaceName || record?.checkInPlaceName
    || (record?.checkOutLatitude != null ? `${record.checkOutLatitude}, ${record.checkOutLongitude}`
      : record?.checkInLatitude != null ? `${record.checkInLatitude}, ${record.checkInLongitude}` : undefined);

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${user.firstName}`} description={formatDate(today)} />
      <EmployeeAttendanceExperience
        attendanceState={attendanceState}
        status={leaveToday ? "ON_LEAVE" : record?.status ?? "NOT_CHECKED_IN"}
        nextAction={nextAction}
        lastLocation={location}
        checkedInAt={record?.checkInTime?.toISOString()}
        checkedOutAt={record?.checkOutTime?.toISOString()}
        totalMinutes={record?.totalMinutes}
      />
      {birthdayRows.length > 0 ? <div className="max-w-md"><BirthdaysThisMonthCard birthdays={birthdayRows} limit={3} /></div> : null}
    </div>
  );
}



