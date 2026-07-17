CREATE TYPE "TaskStepStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED');

CREATE TABLE "TaskStep" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "position" INTEGER NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "assigneeId" TEXT NOT NULL,
  "assignedById" TEXT NOT NULL,
  "sourceDepartmentId" TEXT,
  "targetDepartmentId" TEXT,
  "targetManagerId" TEXT,
  "interdepartmental" BOOLEAN NOT NULL DEFAULT false,
  "status" "TaskStepStatus" NOT NULL DEFAULT 'ASSIGNED',
  "dueAt" TIMESTAMP(3) NOT NULL,
  "startedAt" TIMESTAMP(3),
  "blockedAt" TIMESTAMP(3),
  "blockedReason" TEXT,
  "completedAt" TIMESTAMP(3),
  "completionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaskStep_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskStep_taskId_position_idx" ON "TaskStep"("taskId", "position");
CREATE INDEX "TaskStep_assigneeId_status_dueAt_idx" ON "TaskStep"("assigneeId", "status", "dueAt");
CREATE INDEX "TaskStep_targetManagerId_status_dueAt_idx" ON "TaskStep"("targetManagerId", "status", "dueAt");
CREATE INDEX "TaskStep_sourceDepartmentId_createdAt_idx" ON "TaskStep"("sourceDepartmentId", "createdAt");
CREATE INDEX "TaskStep_targetDepartmentId_createdAt_idx" ON "TaskStep"("targetDepartmentId", "createdAt");
CREATE INDEX "TaskStep_interdepartmental_status_dueAt_idx" ON "TaskStep"("interdepartmental", "status", "dueAt");

ALTER TABLE "TaskStep" ADD CONSTRAINT "TaskStep_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskStep" ADD CONSTRAINT "TaskStep_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskStep" ADD CONSTRAINT "TaskStep_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskStep" ADD CONSTRAINT "TaskStep_targetManagerId_fkey" FOREIGN KEY ("targetManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskStep" ADD CONSTRAINT "TaskStep_sourceDepartmentId_fkey" FOREIGN KEY ("sourceDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskStep" ADD CONSTRAINT "TaskStep_targetDepartmentId_fkey" FOREIGN KEY ("targetDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
