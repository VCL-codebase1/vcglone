import { Role } from "@prisma/client";
import { KnowledgeBasePage } from "@/components/knowledge-base-page";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function AdminKnowledgeBasePage({ searchParams }: { searchParams: { search?: string; category?: string } }) {
  await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  return <KnowledgeBasePage admin searchParams={searchParams} />;
}
