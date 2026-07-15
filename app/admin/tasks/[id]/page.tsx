import { TaskDetailPage } from "@/components/task-detail-page";
export const runtime = "nodejs";
export default function Page({ params }: { params: { id: string } }) { return <TaskDetailPage taskId={params.id} />; }
