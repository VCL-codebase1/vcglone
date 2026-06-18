import { PageHeader, StatusBadge, Table } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function ManagerLeaveCalendarPage() {
  const user = await requireUser();
  const requests = await prisma.leaveRequest.findMany({
    where: { employee: { managerId: user.id }, status: { in: ["PENDING", "APPROVED"] } },
    include: { employee: true, leaveType: true },
    orderBy: { startDate: "asc" },
    take: 100
  });
  return (
    <div className="space-y-6">
      <PageHeader title="Team Leave Calendar" description="Upcoming pending and approved leave across your team." />
      <Table>
        <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Leave</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Status</th></tr></thead>
        <tbody className="divide-y divide-line">
          {requests.map((request) => (
            <tr key={request.id}><td className="px-4 py-3">{request.employee.firstName} {request.employee.lastName}</td><td className="px-4 py-3">{request.leaveType.name}</td><td className="px-4 py-3">{formatDate(request.startDate)} - {formatDate(request.endDate)}</td><td className="px-4 py-3"><StatusBadge value={request.status} /></td></tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
