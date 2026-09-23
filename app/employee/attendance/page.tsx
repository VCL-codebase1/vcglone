import { format } from "date-fns";
import { Role } from "@prisma/client";
import { AttendanceActionCard } from "@/components/attendance-action-card";
import { LiveClock } from "@/components/live-clock";
import { formatDateTime, todayDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function EmployeeAttendancePage() {
  const user = await requireRole([Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN]);
  const today = todayDateOnly();
  const [record, profile] = await Promise.all([
    prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId: user.id, date: today } } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { jobTitle: true, department: { select: { name: true } } } })
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
    <div className="mx-auto max-w-4xl">
      <section className="overflow-hidden rounded-xl border border-line bg-surface">
        <header className="bg-brand px-5 pb-20 pt-6 text-white sm:px-8 sm:pb-24 sm:pt-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-brand ring-4 ring-white/15">
              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.firstName} {user.lastName}</p>
              <p className="truncate text-xs text-white/70">{profile?.jobTitle || profile?.department?.name || user.role.replace(/_/g, " ")}</p>
            </div>
          </div>
          <h1 className="mt-7 text-2xl font-semibold tracking-tight sm:text-3xl">Welcome to vcglOne Attendance</h1>
          <p className="mt-1 text-sm text-white/70">Securely record your workday and working hours.</p>
        </header>

        <div className="-mt-12 px-3 pb-5 sm:-mt-14 sm:px-7 sm:pb-8">
          <div className="mx-auto max-w-2xl">
            <div className="grid grid-cols-2 divide-x divide-line rounded-lg border border-line bg-white px-4 py-3 shadow-[0_10px_30px_rgba(17,25,79,0.08)] sm:px-5">
              <div className="pr-4">
                <p className="text-xs font-medium text-muted">Today</p>
                <p className="mt-1 text-sm font-semibold text-ink">{format(new Date(), "EEE, MMM d, yyyy")}</p>
              </div>
              <div className="pl-4 text-right">
                <p className="text-xs font-medium text-muted">Current time</p>
                <p className="mt-1 text-sm font-semibold text-ink tabular-nums"><LiveClock /></p>
              </div>
            </div>

            <div className="mt-4">
              <AttendanceActionCard
                nextAction={nextAction}
                lastLocation={location}
                checkedInAt={record?.checkInTime?.toISOString()}
                checkedOutAt={record?.checkOutTime?.toISOString()}
                totalMinutes={record?.totalMinutes}
                status={record?.status ?? "NOT_CHECKED_IN"}
              />
            </div>

            {record?.requiresReview ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-warning">Pending review: {record.reviewReason}</p> : null}
            {record?.updatedAt ? <p className="mt-3 text-center text-xs text-muted">Last updated {formatDateTime(record.updatedAt)}</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}


