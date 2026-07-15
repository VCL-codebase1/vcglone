import { Role } from "@prisma/client";
import { AttendanceLiveRefresh } from "@/components/attendance-live-refresh";
import { EmptyState, LinkButton, PageHeader, StatCard, StatusBadge, Table } from "@/components/ui";
import { compactDuration, formatDate, formatTime, todayDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";

type TodayAttendanceSearchParams = {
  search?: string;
  department?: string;
  status?: string;
};

export default async function TodayAttendancePage({ searchParams }: { searchParams: TodayAttendanceSearchParams }) {
  await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const today = todayDateOnly();
  const [employees, attendanceRecords, approvedLeave, departments] = await Promise.all([
    prisma.user.findMany({
      where: { employmentStatus: "ACTIVE", role: { not: Role.SUPER_ADMIN } },
      include: { department: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
    }),
    prisma.attendanceRecord.findMany({ where: { date: today } }),
    prisma.leaveRequest.findMany({
      where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } },
      include: { leaveType: true }
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } })
  ]);

  const attendanceByEmployee = new Map(attendanceRecords.map((record) => [record.employeeId, record]));
  const leaveByEmployee = new Map(approvedLeave.map((request) => [request.employeeId, request]));
  const normalizedSearch = searchParams.search?.trim().toLowerCase() || "";

  const rows = employees
    .map((employee) => {
      const attendance = attendanceByEmployee.get(employee.id);
      const leave = leaveByEmployee.get(employee.id);
      const statusCategory = leave
        ? "on-leave"
        : attendance?.checkOutTime
          ? "checked-out"
          : attendance?.checkInTime
            ? "checked-in"
            : "not-checked-in";
      return { employee, attendance, leave, statusCategory };
    })
    .filter(({ employee, statusCategory }) => {
      const matchesSearch = !normalizedSearch || [employee.firstName, employee.lastName, employee.employeeId, employee.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
      const matchesDepartment = !searchParams.department || employee.departmentId === searchParams.department;
      const matchesStatus = !searchParams.status || statusCategory === searchParams.status;
      return matchesSearch && matchesDepartment && matchesStatus;
    });

  const activeEmployeeIds = new Set(employees.map((employee) => employee.id));
  const checkedIn = attendanceRecords.filter((record) => activeEmployeeIds.has(record.employeeId) && record.checkInTime).length;
  const checkedOut = attendanceRecords.filter((record) => activeEmployeeIds.has(record.employeeId) && record.checkOutTime).length;
  const onLeave = new Set(approvedLeave.filter((request) => activeEmployeeIds.has(request.employeeId)).map((request) => request.employeeId)).size;
  const notCheckedIn = employees.filter((employee) => !attendanceByEmployee.get(employee.id)?.checkInTime && !leaveByEmployee.has(employee.id)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Today's Attendance"
        description={`${formatDate(today)} snapshot of every active staff member. This page updates automatically.`}
        action={(
          <div className="flex flex-col gap-2 sm:flex-row">
            <AttendanceLiveRefresh />
            <LinkButton href="/admin/attendance" variant="secondary">View all attendance records</LinkButton>
          </div>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Active staff" value={employees.length} />
        <StatCard label="Checked in" value={checkedIn} />
        <StatCard label="Checked out" value={checkedOut} />
        <StatCard label="On leave" value={onLeave} />
        <StatCard label="Not checked in" value={notCheckedIn} detail="Excludes approved leave" />
      </div>

      <form className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
        <input
          className="w-full min-w-0 rounded-md border border-line px-3 py-2 text-sm"
          type="search"
          name="search"
          placeholder="Search name, ID, or email"
          defaultValue={searchParams.search}
        />
        <select className="w-full min-w-0 rounded-md border border-line px-3 py-2 text-sm" name="department" defaultValue={searchParams.department || ""}>
          <option value="">All departments</option>
          {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
        </select>
        <select className="w-full min-w-0 rounded-md border border-line px-3 py-2 text-sm" name="status" defaultValue={searchParams.status || ""}>
          <option value="">All statuses</option>
          <option value="checked-in">Checked in, not out</option>
          <option value="checked-out">Checked out</option>
          <option value="on-leave">On approved leave</option>
          <option value="not-checked-in">Not checked in</option>
        </select>
        <button className="min-h-10 w-full rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">Filter</button>
      </form>

      {rows.length ? (
        <Table>
          <thead className="bg-surface text-left text-xs uppercase text-muted">
            <tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Check in</th><th className="px-4 py-3">Check out</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ employee, attendance, leave }) => {
              const location = attendance?.checkOutPlaceName
                || attendance?.checkInPlaceName
                || (attendance?.checkInLatitude || attendance?.checkOutLatitude ? "Captured" : "-");
              return (
                <tr key={employee.id} className={attendance?.requiresReview ? "bg-amber-50/50" : ""}>
                  <td className="px-4 py-3"><p className="font-semibold text-ink">{employee.firstName} {employee.lastName}</p><p className="text-xs text-muted">{employee.employeeId || employee.email}</p></td>
                  <td className="px-4 py-3">{employee.department?.name || "-"}</td>
                  <td className="px-4 py-3">{formatTime(attendance?.checkInTime)}</td>
                  <td className="px-4 py-3">{formatTime(attendance?.checkOutTime)}</td>
                  <td className="px-4 py-3">{compactDuration(attendance?.totalMinutes)}</td>
                  <td className="max-w-xs px-4 py-3 text-muted">{location}</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-2">{leave ? <StatusBadge value={leave.leaveType.name} /> : null}{attendance ? <StatusBadge value={attendance.status} /> : leave ? null : <StatusBadge value="NOT_CHECKED_IN" />}</div></td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      ) : <EmptyState title="No matching staff" description="Try clearing or changing the attendance filters." />}
    </div>
  );
}
