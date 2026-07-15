import { format } from "date-fns";
import { AttendanceActionCard } from "@/components/attendance-action-card";
import { BirthdaysThisMonthCard } from "@/components/birthday-card";
import { EmployeeDashboardActivity } from "@/components/employee-dashboard-activity";
import { LiveClock } from "@/components/live-clock";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { formatDate, formatTime, todayDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function EmployeeDashboardPage() {
  const user = await requireUser();
  const today = todayDateOnly();
  const month = new Date().getMonth() + 1;
  const [record, leaveToday, recentAttendance, balances, leaveRequests, birthdays] = await Promise.all([
    prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId: user.id, date: today } } }),
    prisma.leaveRequest.findFirst({
      where: { employeeId: user.id, status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } },
      include: { leaveType: true }
    }),
    prisma.attendanceRecord.findMany({ where: { employeeId: user.id }, orderBy: { date: "desc" }, take: 5 }),
    prisma.leaveBalance.findMany({ where: { employeeId: user.id, year: new Date().getFullYear() }, include: { leaveType: true }, take: 4 }),
    prisma.leaveRequest.findMany({ where: { employeeId: user.id }, include: { leaveType: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.user.findMany({
      where: { employmentStatus: "ACTIVE", dateOfBirth: { not: null }, role: { not: "SUPER_ADMIN" } },
      include: { department: true },
      orderBy: { firstName: "asc" }
    })
  ]);
  const birthdayRows = birthdays.filter((person) => person.dateOfBirth && person.dateOfBirth.getUTCMonth() + 1 === month);

  const status = leaveToday ? "ON_LEAVE" : record?.status ?? "NOT_CHECKED_IN";
  const nextAction = record?.checkInTime && !record.checkOutTime ? "check-out" : record?.checkInTime && record.checkOutTime ? "done" : "check-in";
  const location = record?.checkOutPlaceName
    || record?.checkInPlaceName
    || (record?.checkOutLatitude
      ? `${record.checkOutLatitude}, ${record.checkOutLongitude}`
      : record?.checkInLatitude
        ? `${record.checkInLatitude}, ${record.checkInLongitude}`
        : undefined);
  const attendanceActivity = recentAttendance.map((row) => ({
    id: row.id,
    date: formatDate(row.date),
    checkIn: formatTime(row.checkInTime),
    checkOut: formatTime(row.checkOutTime),
    status: row.status
  }));
  const leaveActivity = leaveRequests.map((request) => ({
    id: request.id,
    type: request.leaveType.name,
    dates: `${formatDate(request.startDate)} - ${formatDate(request.endDate)}`,
    days: request.totalDays,
    status: request.status
  }));

  return (
    <div className="space-y-5">
      <PageHeader title={`Good day, ${user.firstName}`} description={format(new Date(), "EEEE, MMMM d, yyyy")} action={<div className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-ink shadow-soft dark:bg-panel"><LiveClock /></div>} />
      <AttendanceActionCard
        compact
        status={status}
        nextAction={nextAction}
        lastLocation={location}
        checkedInAt={record?.checkInTime?.toISOString()}
        checkedOutAt={record?.checkOutTime?.toISOString()}
        totalMinutes={record?.totalMinutes}
      />
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <EmployeeDashboardActivity attendance={attendanceActivity} leave={leaveActivity} />
        <div className="space-y-5">
          <Card className="space-y-3">
            <div>
              <h2 className="font-semibold text-ink">Leave balances</h2>
              <p className="mt-0.5 text-sm text-muted">Available days this year.</p>
            </div>
            {balances.length ? (
              <div className="divide-y divide-line">
                {balances.map((balance) => {
                  const percentage = balance.entitlementDays > 0 ? Math.max(0, Math.min(100, (balance.remainingDays / balance.entitlementDays) * 100)) : 0;
                  return (
                    <div key={balance.id} className="py-3 first:pt-1 last:pb-0">
                      <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-ink">{balance.leaveType.name}</p><p className="text-sm font-semibold text-brand">{balance.remainingDays} days</p></div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-brand" style={{ width: `${percentage}%` }} /></div>
                      <p className="mt-1 text-xs text-muted">{balance.remainingDays} of {balance.entitlementDays} remaining</p>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyState title="No leave balances" description="Your available leave will appear here." />}
          </Card>
          <BirthdaysThisMonthCard birthdays={birthdayRows} limit={3} />
        </div>
      </div>
    </div>
  );
}



