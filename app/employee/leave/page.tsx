import { Card, EmptyState, LinkButton, PageHeader, StatusBadge, Table } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function EmployeeLeavePage() {
  const user = await requireUser();
  const year = new Date().getFullYear();
  const [leaveTypes, balances, requests] = await Promise.all([
    prisma.leaveType.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.leaveBalance.findMany({ where: { employeeId: user.id, year: new Date().getFullYear() }, include: { leaveType: true } }),
    prisma.leaveRequest.findMany({ where: { employeeId: user.id }, include: { leaveType: true }, orderBy: { createdAt: "desc" } })
  ]);
  const balanceByType = new Map(balances.map((balance) => [balance.leaveTypeId, balance]));
  const leaveCards = leaveTypes.map((type) => {
    const balance = balanceByType.get(type.id);
    const entitlementDays = balance?.entitlementDays ?? type.annualEntitlementDays;
    const usedDays = balance?.usedDays ?? 0;
    const remainingDays = balance?.remainingDays ?? entitlementDays;
    const usedPercent = entitlementDays > 0 ? Math.min(100, Math.round((usedDays / entitlementDays) * 100)) : 0;

    return { type, entitlementDays, usedDays, remainingDays, usedPercent };
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Leave" description={`View your ${year} leave slots, taken days, available balance, and request status.`} action={<LinkButton href="/employee/leave/apply">Apply for leave</LinkButton>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {leaveCards.map(({ type, entitlementDays, usedDays, remainingDays, usedPercent }) => (
          <Card key={type.id} className="overflow-hidden p-0">
            <div className="border-b border-line bg-gradient-to-br from-white to-brandSoft/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{type.name}</p>
                  <p className="mt-1 text-xs text-muted">{type.isPaid ? "Paid leave" : "Unpaid leave"}</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-brand ring-1 ring-line">{entitlementDays} slots</span>
              </div>
              <p className="mt-4 text-4xl font-semibold tracking-tight text-brand">{remainingDays}</p>
              <p className="text-sm text-muted">available days</p>
            </div>
            <div className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md bg-surface px-3 py-2"><span className="block text-xs text-muted">Taken</span><span className="font-semibold text-ink">{usedDays} days</span></div>
                <div className="rounded-md bg-surface px-3 py-2"><span className="block text-xs text-muted">Total</span><span className="font-semibold text-ink">{entitlementDays} days</span></div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-brand" style={{ width: `${usedPercent}%` }} /></div>
            </div>
          </Card>
        ))}
      </div>
      <Card className="space-y-4">
        <div>
          <h2 className="font-semibold text-ink">Request history</h2>
          <p className="mt-1 text-sm text-muted">Approved and rejected decisions appear here as soon as HR updates them.</p>
        </div>
        {requests.length ? (
          <>
            <div className="space-y-3 md:hidden">
              {requests.map((request) => (
                <div key={request.id} className="rounded-lg border border-line bg-surface/60 p-4">
                  <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-ink">{request.leaveType.name}</p><p className="mt-1 text-sm text-muted">{formatDate(request.startDate)} - {formatDate(request.endDate)}</p></div><StatusBadge value={request.status} /></div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm"><div className="rounded-md bg-white px-3 py-2"><span className="block text-xs text-muted">Days</span><span className="font-semibold text-ink">{request.totalDays}</span></div><div className="rounded-md bg-white px-3 py-2"><span className="block text-xs text-muted">Comment</span><span className="font-semibold text-ink">{request.approvalComment || request.rejectionReason || "-"}</span></div></div>
                </div>
              ))}
            </div>
            <div className="hidden md:block">
              <Table>
                <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Type</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Days</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Comment</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {requests.map((request) => (
                    <tr key={request.id}><td className="px-4 py-3">{request.leaveType.name}</td><td className="px-4 py-3">{formatDate(request.startDate)} - {formatDate(request.endDate)}</td><td className="px-4 py-3">{request.totalDays}</td><td className="px-4 py-3"><StatusBadge value={request.status} /></td><td className="px-4 py-3 text-muted">{request.approvalComment || request.rejectionReason || "-"}</td></tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        ) : <EmptyState title="No leave requests" description="Your leave requests and HR decisions will appear here." />}
      </Card>
    </div>
  );
}



