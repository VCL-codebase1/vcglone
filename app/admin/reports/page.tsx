import { LinkButton, PageHeader, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export default async function ReportsPage() {
  const [attendance, leave, employees, pendingReview] = await Promise.all([
    prisma.attendanceRecord.count(),
    prisma.leaveRequest.count(),
    prisma.user.count(),
    prisma.attendanceRecord.count({ where: { requiresReview: true } })
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Download operational CSV reports for attendance, leave, employees, and pending review records." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Attendance records" value={attendance} />
        <StatCard label="Leave requests" value={leave} />
        <StatCard label="Employees" value={employees} />
        <StatCard label="Pending review" value={pendingReview} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-line bg-white p-4 shadow-soft sm:p-5">
          <h2 className="font-semibold text-ink">Task analytics and reports</h2>
          <p className="mt-1 text-sm text-muted">Analyze organization, department, and employee delivery, then export daily, weekly, or monthly task reports.</p>
          <LinkButton href="/admin/task-reports" className="mt-4" variant="secondary">Open task analytics</LinkButton>
        </section>
        <section className="rounded-lg border border-line bg-white p-4 shadow-soft sm:p-5">
          <h2 className="font-semibold text-ink">Daily attendance report</h2>
          <p className="mt-1 text-sm text-muted">Export with optional date/status filters from the attendance page.</p>
          <LinkButton href="/api/reports/attendance" className="mt-4" variant="secondary">Export attendance CSV</LinkButton>
        </section>
        <section className="rounded-lg border border-line bg-white p-4 shadow-soft sm:p-5">
          <h2 className="font-semibold text-ink">Leave report</h2>
          <p className="mt-1 text-sm text-muted">Export leave request status, dates, approvers, and comments.</p>
          <LinkButton href="/api/reports/leave" className="mt-4" variant="secondary">Export leave CSV</LinkButton>
        </section>
        <section className="rounded-lg border border-line bg-white p-4 shadow-soft sm:p-5">
          <h2 className="font-semibold text-ink">Employee report</h2>
          <p className="mt-1 text-sm text-muted">Export employees, roles, departments, managers, and employment status.</p>
          <LinkButton href="/api/reports/employees" className="mt-4" variant="secondary">Export employees CSV</LinkButton>
        </section>
        <section className="rounded-lg border border-line bg-white p-4 shadow-soft sm:p-5">
          <h2 className="font-semibold text-ink">Pending review attendance</h2>
          <p className="mt-1 text-sm text-muted">Export attendance records that need admin review because location is missing or manual review was requested.</p>
          <LinkButton href="/api/reports/attendance?location=missing" className="mt-4" variant="secondary">Export pending review CSV</LinkButton>
        </section>
      </div>
    </div>
  );
}



