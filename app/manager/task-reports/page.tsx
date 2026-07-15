import { TaskReportPage } from "@/components/task-report-page";

export const runtime = "nodejs";

export default function ManagerTaskReportsPage({ searchParams }: { searchParams: { period?: string; date?: string; employeeId?: string; departmentId?: string } }) {
  return <TaskReportPage scope="team" searchParams={searchParams} />;
}
