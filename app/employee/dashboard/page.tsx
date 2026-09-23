import { addDays, format } from "date-fns";
import Link from "next/link";
import { ArrowUpRight, BookOpen, MessageSquare, ListChecks } from "lucide-react";
import { WeeklyWorkCard } from "@/components/weekly-work-card";
import { AttendanceActionCard } from "@/components/attendance-action-card";
import { BirthdaysThisMonthCard } from "@/components/birthday-card";
import { EmployeeDashboardActivity } from "@/components/employee-dashboard-activity";
import { LiveClock } from "@/components/live-clock";
import { TaskDashboardPanel } from "@/components/task-dashboard-panel";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatDate, formatTime, todayDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function EmployeeDashboardPage() {
  const user = await requireUser();
  const today = todayDateOnly();
  const month = new Date().getMonth() + 1;
  const weekStart = new Date(today);
  weekStart.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
  const [record, leaveToday, recentAttendance, balances, leaveRequests, birthdays, weeklyAttendance] = await Promise.all([
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
    }),
    prisma.attendanceRecord.findMany({ where: { employeeId: user.id, date: { gte: weekStart, lt: addDays(weekStart, 7) }, checkOutTime: { not: null } }, select: { date: true, totalMinutes: true } })
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
      <PageHeader title={`Welcome back, ${user.firstName}`} description={format(new Date(), "EEEE, MMMM d, yyyy")} action={<div className="rounded-full bg-white px-5 py-3 text-sm font-medium text-ink"><LiveClock /></div>} />
      <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-[0.85fr_1fr_1.15fr]">
        <section className="flex flex-col rounded-3xl bg-brand p-6 text-white">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-xl font-medium ring-1 ring-white/25">{user.firstName.charAt(0)}{user.lastName.charAt(0)}</span>
          <h2 className="mt-6 text-2xl font-medium tracking-tight">{user.firstName} {user.lastName}</h2>
          <p className="mt-1 text-sm capitalize text-white/70">{user.role.replace(/_/g, " ").toLowerCase()}</p>
          <div className="mt-auto space-y-2 pt-8">
            {[{ href: "/employee/tasks", label: "My tasks", Icon: ListChecks }, { href: "/employee/chat", label: "Team chat", Icon: MessageSquare }, { href: "/employee/knowledge-base", label: "Knowledge Base", Icon: BookOpen }].map(({ href, label, Icon }) => <Link key={href} href={href} className="focus-ring flex min-h-12 items-center gap-3 rounded-2xl bg-white/10 px-4 text-sm transition hover:bg-white/20"><Icon className="h-4 w-4" /><span className="flex-1">{label}</span><ArrowUpRight className="h-4 w-4 text-white/60" /></Link>)}
          </div>
        </section>
        <WeeklyWorkCard weekStart={weekStart} records={weeklyAttendance} />
        <div className="order-first md:col-span-2 xl:order-none xl:col-span-1">
      <AttendanceActionCard
        status={status}
        nextAction={nextAction}
        lastLocation={location}
        checkedInAt={record?.checkInTime?.toISOString()}
        checkedOutAt={record?.checkOutTime?.toISOString()}
        totalMinutes={record?.totalMinutes}
      />
        </div>
      </div>
      <TaskDashboardPanel user={{ id: user.id, role: user.role }} scope="mine" />
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <EmployeeDashboardActivity attendance={attendanceActivity} leave={leaveActivity} />
        <div className="space-y-5">
          <section className="workspace-section space-y-3">
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
          </section>
          <BirthdaysThisMonthCard birthdays={birthdayRows} limit={3} />
        </div>
      </div>
    </div>
  );
}



