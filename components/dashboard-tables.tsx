"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tanstack-data-table";
import { StatusBadge } from "@/components/ui";

type TodayAttendanceRow = {
  employee: string;
  checkIn: string;
  checkOut: string;
  status: string;
};

const todayAttendanceColumns: ColumnDef<TodayAttendanceRow>[] = [
  {
    accessorKey: "employee",
    header: "Employee"
  },
  {
    accessorKey: "checkIn",
    header: "In"
  },
  {
    accessorKey: "checkOut",
    header: "Out"
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge value={row.original.status} />
  }
];

export function TodayAttendanceDataTable({ data }: { data: TodayAttendanceRow[] }) {
  return <DataTable columns={todayAttendanceColumns} data={data} />;
}
