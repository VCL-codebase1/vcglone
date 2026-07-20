import { LeaveRequestStatus, Role } from "@prisma/client";
import { decideLeaveRequest } from "@/lib/actions";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { Button, Card, EmptyState, LinkButton, PageHeader, StatusBadge, Table, Textarea } from "@/components/ui";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function AdminLeaveRequestsPage({ searchParams }: { searchParams: { status?: string; type?: string; employee?: string } }) {
  await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const [requests, employees, types] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { status: searchParams.status ? (searchParams.status as LeaveRequestStatus) : undefined, leaveTypeId: searchParams.type || undefined, employeeId: searchParams.employee || undefined },
      include: { employee: { include: { department: true } }, leaveType: true },
      orderBy: { createdAt: "desc" },
      take: 200
    }),
    prisma.user.findMany({ orderBy: { firstName: "asc" }, select: { id: true, firstName: true, lastName: true } }),
    prisma.leaveType.findMany({ orderBy: { name: "asc" } })
  ]);
  const query = new URLSearchParams(searchParams as Record<string, string>).toString();
  return (
    <div className="space-y-6">
      <PageHeader title="Leave Requests" description="Review and decide employee leave requests." action={<LinkButton href={`/api/reports/leave?${query}`} variant="secondary">Download report</LinkButton>} />
      <form className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-soft sm:grid-cols-2 xl:grid-cols-4">
        <select className="w-full min-w-0 rounded-md border border-line px-3 py-2 text-sm" name="employee" defaultValue={searchParams.employee || ""}><option value="">All employees</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}</select>
        <select className="w-full min-w-0 rounded-md border border-line px-3 py-2 text-sm" name="type" defaultValue={searchParams.type || ""}><option value="">All leave types</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select>
        <select className="w-full min-w-0 rounded-md border border-line px-3 py-2 text-sm" name="status" defaultValue={searchParams.status || ""}><option value="">All statuses</option>{Object.values(LeaveRequestStatus).map((status) => <option key={status}>{status}</option>)}</select>
        <button className="min-h-10 w-full rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">Filter</button>
      </form>
      {requests.length ? (
        <>
          <div className="space-y-4 lg:hidden">
            {requests.map((request) => (
              <Card key={request.id} className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{request.employee.firstName} {request.employee.lastName}</p>
                    <p className="mt-1 text-sm text-muted">{request.employee.department?.name || "No department"}</p>
                  </div>
                  <StatusBadge value={request.status} />
                </div>
                <div className="grid gap-3 rounded-lg bg-surface p-3 text-sm sm:grid-cols-3">
                  <div><span className="block text-xs text-muted">Leave type</span><span className="font-semibold text-ink">{request.leaveType.name}</span></div>
                  <div><span className="block text-xs text-muted">Dates</span><span className="font-semibold text-ink">{formatDate(request.startDate)} - {formatDate(request.endDate)}</span></div>
                  <div><span className="block text-xs text-muted">Days</span><span className="font-semibold text-ink">{request.totalDays}</span></div>
                </div>
                <p className="rounded-md border border-line bg-white px-3 py-2 text-sm text-muted">{request.reason}</p>
                {request.status === "PENDING" ? <form action={decideLeaveRequest} className="space-y-3"><input type="hidden" name="requestId" value={request.id} /><Textarea name="comment" rows={3} placeholder="Decision comment" /><div className="flex flex-col gap-2 sm:flex-row"><Button name="decision" value="approve" type="submit">Approve</Button><Button name="decision" value="reject" type="submit" variant="danger">Reject</Button></div></form> : null}
              </Card>
            ))}
          </div>
          <div className="hidden lg:block">
            <Table>
              <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead>
              <tbody className="divide-y divide-line align-top">
                {requests.map((request) => <tr key={request.id}><td className="px-4 py-3 font-medium">{request.employee.firstName} {request.employee.lastName}<br /><span className="text-xs text-muted">{request.employee.department?.name || "-"}</span></td><td className="px-4 py-3">{request.leaveType.name}<br /><span className="text-xs text-muted">{request.totalDays} days</span></td><td className="px-4 py-3">{formatDate(request.startDate)} - {formatDate(request.endDate)}</td><td className="max-w-xs px-4 py-3 text-muted">{request.reason}</td><td className="px-4 py-3"><StatusBadge value={request.status} /></td><td className="px-4 py-3">{request.status === "PENDING" ? <form action={decideLeaveRequest} className="space-y-2"><input type="hidden" name="requestId" value={request.id} /><Textarea name="comment" rows={2} placeholder="Comment" /><div className="flex gap-2"><Button name="decision" value="approve" type="submit">Approve</Button><Button name="decision" value="reject" type="submit" variant="danger">Reject</Button></div></form> : "-"}</td></tr>)}
              </tbody>
            </Table>
          </div>
        </>
      ) : <EmptyState title="No leave requests" description="Employee leave requests will appear here for HR review." />}
    </div>
  );
}



