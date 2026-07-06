import { Role } from "@prisma/client";
import { AttendanceActionCard } from "@/components/attendance-action-card";
import { BirthdaysThisMonthCard } from "@/components/birthday-card";
import { PageHeader, StatCard, StatusBadge, Table } from "@/components/ui";
import { formatDate, formatTime, todayDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function ManagerDashboardPage() {
  const user = await requireUser();
  const today = todayDateOnly();
  const month = new Date().getMonth() + 1;
  const [selfAttendance, teamCount, teamAttendance, pendingLeave, birthdays] = await Promise.all([
    prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId: user.id, date: today } } }),
    prisma.user.count({ where: { managerId: user.id, employmentStatus: "ACTIVE" } }),
    prisma.attendanceRecord.findMany({
      where: { date: today, employee: { managerId: user.id } },
      include: { employee: true },
      orderBy: { checkInTime: "desc" }
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

  return (
    <div className="space-y-6">
      <PageHeader title="Manager Dashboard" description="Team attendance visibility and pending leave approvals." />
      {user.role !== Role.SUPER_ADMIN ? (
        <AttendanceActionCard
          nextAction={nextAction}
          lastLocation={location}
          checkedInAt={selfAttendance?.checkInTime?.toISOString()}
          checkedOutAt={selfAttendance?.checkOutTime?.toISOString()}
          totalMinutes={selfAttendance?.totalMinutes}
        />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Team members" value={teamCount} />
        <StatCard label="Checked in today" value={teamAttendance.filter((row) => row.checkInTime).length} />
        <StatCard label="Pending approvals" value={pendingLeave} />
      </div>
      <BirthdaysThisMonthCard birthdays={birthdayRows} />
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



