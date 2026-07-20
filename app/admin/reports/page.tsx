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
      <PageHeader title="Reports" description="Download attendance, leave, employee, and review reports when you need them." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Attendance records" value={attendance} />
        <StatCard label="Leave requests" value={leave} />
        <StatCard label="Employees" value={employees} />
        <StatCard label="Pending review" value={pendingReview} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-line bg-white p-4 shadow-soft sm:p-5">
          <h2 className="font-semibold text-ink">Task analytics and reports</h2>
          <p className="mt-1 text-sm text-muted">Compare task progress across the organization, departments, and employees for any selected period.</p>
          <LinkButton href="/admin/task-reports" className="mt-4" variant="secondary">View task reports</LinkButton>
        </section>
        <section className="rounded-lg border border-line bg-white p-4 shadow-soft sm:p-5">
          <h2 className="font-semibold text-ink">Daily attendance report</h2>
          <p className="mt-1 text-sm text-muted">Download attendance details and narrow the results by date or status.</p>
          <LinkButton href="/api/reports/attendance" className="mt-4" variant="secondary">Download attendance report</LinkButton>
        </section>
        <section className="rounded-lg border border-line bg-white p-4 shadow-soft sm:p-5">
          <h2 className="font-semibold text-ink">Leave report</h2>
          <p className="mt-1 text-sm text-muted">Download leave dates, decisions, approvers, and comments.</p>
          <LinkButton href="/api/reports/leave" className="mt-4" variant="secondary">Download leave report</LinkButton>
        </section>
        <section className="rounded-lg border border-line bg-white p-4 shadow-soft sm:p-5">
          <h2 className="font-semibold text-ink">Employee report</h2>
          <p className="mt-1 text-sm text-muted">Download employee roles, departments, managers, and employment status.</p>
          <LinkButton href="/api/reports/employees" className="mt-4" variant="secondary">Download employee report</LinkButton>
        </section>
        <section className="rounded-lg border border-line bg-white p-4 shadow-soft sm:p-5">
          <h2 className="font-semibold text-ink">Pending review attendance</h2>
          <p className="mt-1 text-sm text-muted">Download attendance entries that need attention because location details are missing or a review was requested.</p>
          <LinkButton href="/api/reports/attendance?location=missing" className="mt-4" variant="secondary">Download review report</LinkButton>
        </section>
      </div>
    </div>
  );
}



