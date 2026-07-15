import { TaskReportPage } from "@/components/task-report-page";

export const runtime = "nodejs";

export default function EmployeeTaskReportsPage({ searchParams }: { searchParams: { period?: string; date?: string } }) {
  return <TaskReportPage scope="mine" searchParams={searchParams} />;
}
