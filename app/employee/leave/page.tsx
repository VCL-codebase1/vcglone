import { LinkButton, PageHeader, StatusBadge, Table } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function EmployeeLeavePage() {
  const user = await requireUser();
  const [balances, requests] = await Promise.all([
    prisma.leaveBalance.findMany({ where: { employeeId: user.id, year: new Date().getFullYear() }, include: { leaveType: true } }),
    prisma.leaveRequest.findMany({ where: { employeeId: user.id }, include: { leaveType: true }, orderBy: { createdAt: "desc" } })
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Leave" description="View balances and request status." action={<LinkButton href="/employee/leave/apply">Apply for leave</LinkButton>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {balances.map((balance) => (
          <div key={balance.id} className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <p className="font-semibold text-ink">{balance.leaveType.name}</p>
            <p className="mt-2 text-3xl font-semibold text-brand">{balance.remainingDays}</p>
            <p className="text-sm text-muted">{balance.usedDays} used of {balance.entitlementDays}</p>
          </div>
        ))}
      </div>
      <Table>
        <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Type</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Days</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Comment</th></tr></thead>
        <tbody className="divide-y divide-line">
          {requests.map((request) => (
            <tr key={request.id}><td className="px-4 py-3">{request.leaveType.name}</td><td className="px-4 py-3">{formatDate(request.startDate)} - {formatDate(request.endDate)}</td><td className="px-4 py-3">{request.totalDays}</td><td className="px-4 py-3"><StatusBadge value={request.status} /></td><td className="px-4 py-3 text-muted">{request.approvalComment || request.rejectionReason || "-"}</td></tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}



