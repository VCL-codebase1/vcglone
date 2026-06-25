import { format } from "date-fns";
import { CalendarDays, ClipboardCheck } from "lucide-react";
import { AttendanceActionCard } from "@/components/attendance-action-card";
import { LiveClock } from "@/components/live-clock";
import { Card, EmptyState, PageHeader, StatCard, StatusBadge, Table } from "@/components/ui";
import { compactDuration, formatDate, formatDateTime, formatTime, todayDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function EmployeeDashboardPage() {
  const user = await requireUser();
  const today = todayDateOnly();
  const [record, leaveToday, recentAttendance, balances, leaveRequests, workPolicy] = await Promise.all([
    prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId: user.id, date: today } } }),
    prisma.leaveRequest.findFirst({
      where: { employeeId: user.id, status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } },
      include: { leaveType: true }
    }),
    prisma.attendanceRecord.findMany({ where: { employeeId: user.id }, orderBy: { date: "desc" }, take: 5 }),
    prisma.leaveBalance.findMany({ where: { employeeId: user.id, year: new Date().getFullYear() }, include: { leaveType: true }, take: 4 }),
    prisma.leaveRequest.findMany({ where: { employeeId: user.id }, include: { leaveType: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.workPolicy.findFirst()
  ]);

  const status = leaveToday ? "ON_LEAVE" : record?.status ?? "NOT_CHECKED_IN";
  const nextAction = record?.checkInTime && !record.checkOutTime ? "check-out" : record?.checkInTime && record.checkOutTime ? "done" : "check-in";
  const coords = record?.checkOutLatitude
    ? `${record.checkOutLatitude}, ${record.checkOutLongitude}`
    : record?.checkInLatitude
      ? `${record.checkInLatitude}, ${record.checkInLongitude}`
      : undefined;

  return (
    <div className="space-y-6">
      <PageHeader title={`Good day, ${user.firstName}`} description={`${format(new Date(), "EEEE, MMMM d, yyyy")} ?? `} action={<div className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-ink shadow-soft"><LiveClock /></div>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today" value={<StatusBadge value={status} />} detail="Attendance status" />
        <StatCard label="Check in" value={formatTime(record?.checkInTime)} />
        <StatCard label="Check out" value={formatTime(record?.checkOutTime)} />
        <StatCard label="Duration" value={compactDuration(record?.totalMinutes)} />
      </div>
      <AttendanceActionCard nextAction={nextAction} lastCoordinates={coords} workEndTime={workPolicy?.workEndTime} />
      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-brand" aria-hidden />
            <h2 className="font-semibold text-ink">Recent attendance</h2>
          </div>
          {recentAttendance.length ? (
            <Table>
              <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">In</th><th className="px-4 py-3">Out</th><th className="px-4 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-line">
                {recentAttendance.map((row) => (
                  <tr key={row.id}><td className="px-4 py-3">{formatDate(row.date)}</td><td className="px-4 py-3">{formatTime(row.checkInTime)}</td><td className="px-4 py-3">{formatTime(row.checkOutTime)}</td><td className="px-4 py-3"><StatusBadge value={row.status} /></td></tr>
                ))}
              </tbody>
            </Table>
          ) : <EmptyState title="No attendance yet" description="Your attendance records will appear after your first check-in." />}
        </Card>
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-brand" aria-hidden />
            <h2 className="font-semibold text-ink">Leave balances</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {balances.map((balance) => (
              <div key={balance.id} className="rounded-md border border-line p-3">
                <p className="text-sm font-semibold text-ink">{balance.leaveType.name}</p>
                <p className="mt-1 text-2xl font-semibold text-brand">{balance.remainingDays}</p>
                <p className="text-xs text-muted">remaining of {balance.entitlementDays} days</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <h2 className="mb-4 font-semibold text-ink">Recent leave requests</h2>
        {leaveRequests.length ? (
          <Table>
            <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Type</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Days</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-line">
              {leaveRequests.map((request) => (
                <tr key={request.id}><td className="px-4 py-3">{request.leaveType.name}</td><td className="px-4 py-3">{formatDate(request.startDate)} - {formatDate(request.endDate)}</td><td className="px-4 py-3">{request.totalDays}</td><td className="px-4 py-3"><StatusBadge value={request.status} /></td></tr>
              ))}
            </tbody>
          </Table>
        ) : <EmptyState title="No leave requests" description="Your leave applications will appear here." />}
      </Card>
    </div>
  );
}



