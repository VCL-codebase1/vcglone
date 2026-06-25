import { AttendanceStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { manuallyAdjustAttendance } from "@/lib/actions";
import { compactDuration, formatDate, formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { Button, Card, Field, PageHeader, Select, StatusBadge, Textarea } from "@/components/ui";

export const runtime = "nodejs";

export default async function AttendanceDetailPage({ params }: { params: { id: string } }) {
  const record = await prisma.attendanceRecord.findUnique({ where: { id: params.id }, include: { employee: true, adjustedBy: true } });
  if (!record) notFound();
  const fields = [
    ["Employee", `${record.employee.firstName} ${record.employee.lastName}`],
    ["Date", formatDate(record.date)],
    ["Check-in time", formatDateTime(record.checkInTime)],
    ["Check-in location", record.checkInPlaceName || "-"],
    ["Check-in coordinates", record.checkInLatitude ? `${record.checkInLatitude}, ${record.checkInLongitude}` : "Missing"],
    ["Check-in GPS accuracy", record.checkInAccuracy ? `${Math.round(record.checkInAccuracy)}m` : "-"],
    ["Check-in device", record.checkInUserAgent || "-"],
    ["Check-in note", record.checkInNote || "-"],
    ["Check-out time", formatDateTime(record.checkOutTime)],
    ["Check-out location", record.checkOutPlaceName || "-"],
    ["Check-out coordinates", record.checkOutLatitude ? `${record.checkOutLatitude}, ${record.checkOutLongitude}` : "Missing"],
    ["Check-out GPS accuracy", record.checkOutAccuracy ? `${Math.round(record.checkOutAccuracy)}m` : "-"],
    ["Check-out device", record.checkOutUserAgent || "-"],
    ["Check-out note", record.checkOutNote || "-"],
    ["Duration", compactDuration(record.totalMinutes)],
    ["Review reason", record.reviewReason || "-"],
    ["Adjustment", record.manuallyAdjusted ? `${record.adjustmentReason} (${record.adjustedBy?.firstName || "Admin"})` : "-"]
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Attendance Detail" description="Captured GPS, accuracy, notes, device information, and adjustment workflow." action={<StatusBadge value={record.status} />} />
      <Card><dl className="divide-y divide-line">{fields.map(([label, value]) => <div key={label} className="grid gap-2 py-3 md:grid-cols-4"><dt className="text-sm font-medium text-muted">{label}</dt><dd className="break-words text-sm font-semibold text-ink md:col-span-3">{value}</dd></div>)}</dl></Card>
      <Card>
        <h2 className="mb-4 font-semibold text-ink">Manual adjustment</h2>
        <form action={manuallyAdjustAttendance} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="recordId" value={record.id} />
          <Field label="Status"><Select name="status" defaultValue={record.status}>{Object.values(AttendanceStatus).map((status) => <option key={status}>{status}</option>)}</Select></Field>
          <div className="md:col-span-2"><Field label="Mandatory reason"><Textarea name="reason" rows={3} minLength={10} required /></Field></div>
          <div className="md:col-span-3"><Button type="submit">Save adjustment</Button></div>
        </form>
      </Card>
    </div>
  );
}



