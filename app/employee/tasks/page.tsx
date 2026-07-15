import { TaskListPage } from "@/components/task-list-page";

export const runtime = "nodejs";

export default function EmployeeTasksPage({ searchParams }: { searchParams: { status?: string; priority?: string; q?: string } }) {
  return <TaskListPage scope="mine" searchParams={searchParams} />;
}
