import { LeaveRequestStatus } from "@prisma/client";
import { decideLeaveRequest } from "@/lib/actions";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { Button, LinkButton, PageHeader, StatusBadge, Table, Textarea } from "@/components/ui";

export const runtime = "nodejs";

export default async function AdminLeaveRequestsPage({ searchParams }: { searchParams: { status?: string; type?: string; employee?: string } }) {
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
      <PageHeader title="Leave Requests" description="View, filter, approve, reject, and export leave requests." action={<LinkButton href={`/api/reports/leave?${query}`} variant="secondary">Export CSV</LinkButton>} />
      <form className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-soft md:grid-cols-4">
        <select className="rounded-md border border-line px-3 py-2 text-sm" name="employee" defaultValue={searchParams.employee || ""}><option value="">All employees</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}</select>
        <select className="rounded-md border border-line px-3 py-2 text-sm" name="type" defaultValue={searchParams.type || ""}><option value="">All leave types</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select>
        <select className="rounded-md border border-line px-3 py-2 text-sm" name="status" defaultValue={searchParams.status || ""}><option value="">All statuses</option>{Object.values(LeaveRequestStatus).map((status) => <option key={status}>{status}</option>)}</select>
        <button className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">Filter</button>
      </form>
      <Table>
        <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead>
        <tbody className="divide-y divide-line align-top">
          {requests.map((request) => <tr key={request.id}><td className="px-4 py-3 font-medium">{request.employee.firstName} {request.employee.lastName}<br /><span className="text-xs text-muted">{request.employee.department?.name || "-"}</span></td><td className="px-4 py-3">{request.leaveType.name}<br /><span className="text-xs text-muted">{request.totalDays} days</span></td><td className="px-4 py-3">{formatDate(request.startDate)} - {formatDate(request.endDate)}</td><td className="max-w-xs px-4 py-3 text-muted">{request.reason}</td><td className="px-4 py-3"><StatusBadge value={request.status} /></td><td className="px-4 py-3">{request.status === "PENDING" ? <form action={decideLeaveRequest} className="space-y-2"><input type="hidden" name="requestId" value={request.id} /><Textarea name="comment" rows={2} placeholder="Comment" /><div className="flex gap-2"><Button name="decision" value="approve" type="submit">Approve</Button><Button name="decision" value="reject" type="submit" variant="danger">Reject</Button></div></form> : "-"}</td></tr>)}
        </tbody>
      </Table>
    </div>
  );
}
