import { TodayAttendanceDataTable } from "@/components/dashboard-tables";
import { SystemPulse } from "@/components/system-pulse";
import { PageHeader, StatCard } from "@/components/ui";
import { formatTime, todayDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export default async function AdminDashboardPage() {
  const today = todayDateOnly();
  const [totalEmployees, checkedIn, checkedOut, pendingReview, onLeave, pendingLeave, todayAttendance] = await Promise.all([
    prisma.user.count({ where: { employmentStatus: "ACTIVE" } }),
    prisma.attendanceRecord.count({ where: { date: today, checkInTime: { not: null } } }),
    prisma.attendanceRecord.count({ where: { date: today, checkOutTime: { not: null } } }),
    prisma.attendanceRecord.count({ where: { requiresReview: true } }),
    prisma.leaveRequest.count({ where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } } }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.attendanceRecord.findMany({ where: { date: today }, include: { employee: true }, orderBy: { checkInTime: "desc" }, take: 10 })
  ]);
  const todayAttendanceRows = todayAttendance.map((record) => ({
    employee: `${record.employee.firstName} ${record.employee.lastName}`,
    checkIn: formatTime(record.checkInTime),
    checkOut: formatTime(record.checkOutTime),
    status: record.status
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Dashboard" description="Organization-wide attendance, leave, and workforce operations overview." action={<SystemPulse />} />
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
      </div>
    </div>
  );
}



