"use client";

import { useState } from "react";
import { Card, EmptyState, StatusBadge, Table } from "@/components/ui";
import { DashboardSectionHeader } from "@/components/dashboard-overview";

type AttendanceRow = {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
};

type LeaveRow = {
  id: string;
  type: string;
  dates: string;
  days: number;
  status: string;
};

export function EmployeeDashboardActivity({ attendance, leave }: { attendance: AttendanceRow[]; leave: LeaveRow[] }) {
  const [activeTab, setActiveTab] = useState<"attendance" | "leave">("attendance");
  const isAttendance = activeTab === "attendance";

  return (
    <Card className="space-y-4">
      <DashboardSectionHeader
        title="Recent activity"
        description="Your latest attendance and leave updates."
        href={isAttendance ? "/employee/attendance/history" : "/employee/leave"}
      />
      <div className="inline-flex rounded-xl bg-surface p-1" role="tablist" aria-label="Recent activity">
        <button
          type="button"
          role="tab"
          aria-selected={isAttendance}
          onClick={() => setActiveTab("attendance")}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${isAttendance ? "bg-white text-brand shadow-soft dark:bg-panel" : "text-muted hover:text-ink"}`}
        >
          Attendance
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!isAttendance}
          onClick={() => setActiveTab("leave")}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${!isAttendance ? "bg-white text-brand shadow-soft dark:bg-panel" : "text-muted hover:text-ink"}`}
        >
          Leave requests
        </button>
      </div>

      {isAttendance ? (
        attendance.length ? (
          <Table>
            <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">In</th><th className="px-4 py-3">Out</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-line">
              {attendance.map((row) => (
                <tr key={row.id}><td className="px-4 py-3">{row.date}</td><td className="px-4 py-3">{row.checkIn}</td><td className="px-4 py-3">{row.checkOut}</td><td className="px-4 py-3"><StatusBadge value={row.status} /></td></tr>
              ))}
            </tbody>
          </Table>
        ) : <EmptyState title="No attendance yet" description="Your attendance records will appear after your first check-in." />
      ) : leave.length ? (
        <Table>
          <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Type</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Days</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody className="divide-y divide-line">
            {leave.map((row) => (
              <tr key={row.id}><td className="px-4 py-3">{row.type}</td><td className="px-4 py-3">{row.dates}</td><td className="px-4 py-3">{row.days}</td><td className="px-4 py-3"><StatusBadge value={row.status} /></td></tr>
            ))}
          </tbody>
        </Table>
      ) : <EmptyState title="No leave requests" description="Your leave applications will appear here." />}
    </Card>
  );
}
