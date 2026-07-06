import { Role } from "@prisma/client";
import { LeaveApplyForm } from "@/components/leave-apply-form";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function ApplyLeavePage() {
  await requireRole([Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN]);
  const leaveTypes = await prisma.leaveType.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Apply for Leave" description="Select a leave type, date range, and reason. Working days are calculated when the request is submitted." />
      <LeaveApplyForm leaveTypes={leaveTypes} />
    </div>
  );
}


