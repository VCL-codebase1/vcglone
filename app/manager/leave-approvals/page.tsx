import { decideLeaveRequest } from "@/lib/actions";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { Button, Field, PageHeader, Table, Textarea } from "@/components/ui";

export const runtime = "nodejs";

export default async function ManagerLeaveApprovalsPage() {
  const user = await requireUser();
  const requests = await prisma.leaveRequest.findMany({
    where: { status: "PENDING", employee: { managerId: user.id } },
    include: { employee: true, leaveType: true },
    orderBy: { createdAt: "asc" }
  });
  return (
    <div className="space-y-6">
      <PageHeader title="Leave Approvals" description="Approve or reject pending leave requests for your assigned team." />
      <Table>
        <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Decision</th></tr></thead>
        <tbody className="divide-y divide-line align-top">
          {requests.map((request) => (
            <tr key={request.id}>
              <td className="px-4 py-3 font-medium">{request.employee.firstName} {request.employee.lastName}</td>
              <td className="px-4 py-3">{request.leaveType.name}<br /><span className="text-xs text-muted">{request.totalDays} days</span></td>
              <td className="px-4 py-3">{formatDate(request.startDate)} - {formatDate(request.endDate)}</td>
              <td className="max-w-xs px-4 py-3 text-muted">{request.reason}</td>
              <td className="px-4 py-3">
                <form action={decideLeaveRequest} className="space-y-2">
                  <input type="hidden" name="requestId" value={request.id} />
                  <Field label="Comment">
                    <Textarea name="comment" rows={2} />
                  </Field>
                  <div className="flex gap-2">
                    <Button name="decision" value="approve" type="submit">Approve</Button>
                    <Button name="decision" value="reject" variant="danger" type="submit">Reject</Button>
                  </div>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}


