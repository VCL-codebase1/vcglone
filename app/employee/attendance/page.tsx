import { format } from "date-fns";
import { AttendanceActionCard } from "@/components/attendance-action-card";
import { LiveClock } from "@/components/live-clock";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { formatDateTime, formatTime, todayDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function EmployeeAttendancePage() {
  const user = await requireUser();
  const today = todayDateOnly();
  const [record, workPolicy] = await Promise.all([
    prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId: user.id, date: today } } }),
    prisma.workPolicy.findFirst()
  ]);
  const nextAction = record?.checkInTime && !record.checkOutTime ? "check-out" : record?.checkInTime && record.checkOutTime ? "done" : "check-in";
  const location = record?.checkOutPlaceName
    || record?.checkInPlaceName
    || (record?.checkOutLatitude
      ? `${record.checkOutLatitude}, ${record.checkOutLongitude}`
      : record?.checkInLatitude
        ? `${record.checkInLatitude}, ${record.checkInLongitude}`
        : undefined);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Attendance" description={`${format(new Date(), "EEEE, MMMM d, yyyy")} - Current time: `} action={<div className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-ink shadow-soft"><LiveClock /></div>} />
      <Card className="grid gap-4 sm:grid-cols-3">
        <div><p className="text-sm text-muted">Status</p><div className="mt-2"><StatusBadge value={record?.status ?? "NOT_CHECKED_IN"} /></div></div>
        <div><p className="text-sm text-muted">Check in</p><p className="mt-2 font-semibold text-ink">{formatTime(record?.checkInTime)}</p></div>
        <div><p className="text-sm text-muted">Check out</p><p className="mt-2 font-semibold text-ink">{formatTime(record?.checkOutTime)}</p></div>
        {record?.requiresReview ? <p className="sm:col-span-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-warning">Pending review: {record.reviewReason}</p> : null}
        {record?.updatedAt ? <p className="sm:col-span-3 text-xs text-muted">Last updated {formatDateTime(record.updatedAt)}</p> : null}
      </Card>
      <AttendanceActionCard nextAction={nextAction} lastLocation={location} workEndTime={workPolicy?.workEndTime} />
    </div>
  );
}


