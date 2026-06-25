import { Role } from "@prisma/client";
import { LeaveApplyForm } from "@/components/leave-apply-form";
import { PageHeader } from "@/components/ui";
import { getUploadConfig } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function ApplyLeavePage() {
  await requireRole([Role.EMPLOYEE]);
  const leaveTypes = await prisma.leaveType.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const uploadConfig = getUploadConfig();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Apply for Leave" description="Select a leave type, date range, and reason. Working days are calculated when the request is submitted." />
      {!uploadConfig.enabled ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-warning">
          Document upload storage is not configured. Attachment fields are disabled until UPLOAD_PROVIDER is configured.
        </div>
      ) : null}
      <LeaveApplyForm leaveTypes={leaveTypes} uploadEnabled={uploadConfig.enabled} />
    </div>
  );
}


