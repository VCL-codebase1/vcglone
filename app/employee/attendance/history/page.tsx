import { Card, EmptyState, PageHeader, StatusBadge, Table } from "@/components/ui";
import { compactDuration, formatDate, formatTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function AttendanceHistoryPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const user = await requireUser();
  const records = await prisma.attendanceRecord.findMany({
    where: {
      employeeId: user.id,
      date: {
        gte: searchParams.from ? new Date(searchParams.from) : undefined,
        lte: searchParams.to ? new Date(searchParams.to) : undefined
      }
    },
    orderBy: { date: "desc" }
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance History" description="Filter and review your personal attendance records." />
      <form className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-soft sm:grid-cols-3">
        <input className="w-full min-w-0 rounded-md border border-line px-3 py-2 text-sm" type="date" name="from" defaultValue={searchParams.from} />
        <input className="w-full min-w-0 rounded-md border border-line px-3 py-2 text-sm" type="date" name="to" defaultValue={searchParams.to} />
        <button className="min-h-10 w-full rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">Apply filters</button>
      </form>
      {records.length ? (
        <>
          <div className="space-y-3 md:hidden">
            {records.map((record) => {
              const hasLocation = Boolean(record.checkInLatitude || record.checkOutLatitude);
              const note = record.checkInNote || record.checkOutNote;

              return (
                <Card key={record.id} className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{formatDate(record.date)}</p>
                      <p className="mt-1 text-xs text-muted">Location {hasLocation ? "captured" : "missing"}</p>
                    </div>
                    <StatusBadge value={record.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface p-3 text-center">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">In</p>
                      <p className="mt-1 text-sm font-semibold text-ink">{formatTime(record.checkInTime)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Out</p>
                      <p className="mt-1 text-sm font-semibold text-ink">{formatTime(record.checkOutTime)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Total</p>
                      <p className="mt-1 text-sm font-semibold text-ink">{compactDuration(record.totalMinutes)}</p>
                    </div>
                  </div>
                  {note ? <p className="rounded-md border border-line bg-white px-3 py-2 text-sm text-muted">{note}</p> : null}
                </Card>
              );
            })}
          </div>
          <div className="hidden md:block">
            <Table>
              <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Check in</th><th className="px-4 py-3">Check out</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Notes</th></tr></thead>
              <tbody className="divide-y divide-line">
                {records.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-3">{formatDate(record.date)}</td>
                    <td className="px-4 py-3">{formatTime(record.checkInTime)}</td>
                    <td className="px-4 py-3">{formatTime(record.checkOutTime)}</td>
                    <td className="px-4 py-3">{compactDuration(record.totalMinutes)}</td>
                    <td className="px-4 py-3">{record.checkInLatitude || record.checkOutLatitude ? "Captured" : "Missing"}</td>
                    <td className="px-4 py-3"><StatusBadge value={record.status} /></td>
                    <td className="max-w-xs px-4 py-3 text-muted">{record.checkInNote || record.checkOutNote || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      ) : <EmptyState title="No attendance records" description="Try a different date range or check in for today." />}
    </div>
  );
}


