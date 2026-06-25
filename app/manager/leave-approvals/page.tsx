import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { Card, EmptyState, PageHeader, StatusBadge, Table } from "@/components/ui";

export const runtime = "nodejs";

export default async function ManagerLeaveApprovalsPage() {
  const user = await requireUser();
  const requests = await prisma.leaveRequest.findMany({
    where: { employee: { managerId: user.id } },
    include: { employee: true, leaveType: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return (
    <div className="space-y-6">
      <PageHeader title="Team Leave Requests" description="Track leave requests for your assigned team. HR Admin handles approvals and rejections." />
      {requests.length ? (
        <>
          <div className="space-y-3 md:hidden">
            {requests.map((request) => (
              <Card key={request.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-ink">{request.employee.firstName} {request.employee.lastName}</p><p className="mt-1 text-sm text-muted">{request.leaveType.name}</p></div><StatusBadge value={request.status} /></div>
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface p-3 text-sm"><div><span className="block text-xs text-muted">Dates</span><span className="font-semibold text-ink">{formatDate(request.startDate)} - {formatDate(request.endDate)}</span></div><div><span className="block text-xs text-muted">Days</span><span className="font-semibold text-ink">{request.totalDays}</span></div></div>
                <p className="text-sm text-muted">{request.reason}</p>
              </Card>
            ))}
          </div>
          <div className="hidden md:block">
            <Table>
              <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-line align-top">
                {requests.map((request) => (
                  <tr key={request.id}><td className="px-4 py-3 font-medium">{request.employee.firstName} {request.employee.lastName}</td><td className="px-4 py-3">{request.leaveType.name}<br /><span className="text-xs text-muted">{request.totalDays} days</span></td><td className="px-4 py-3">{formatDate(request.startDate)} - {formatDate(request.endDate)}</td><td className="max-w-xs px-4 py-3 text-muted">{request.reason}</td><td className="px-4 py-3"><StatusBadge value={request.status} /></td></tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      ) : <EmptyState title="No team leave requests" description="Leave requests from your assigned team will appear here." />}
    </div>
  );
}


