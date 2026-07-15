CREATE TYPE "TaskStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'CHANGES_REQUESTED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "TaskResourceType" AS ENUM ('LINK', 'FILE');

CREATE TABLE "Task" (
  "id" TEXT NOT NULL,
  "taskCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "expectedOutcome" TEXT,
  "assigneeId" TEXT NOT NULL,
  "assignedById" TEXT NOT NULL,
  "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "status" "TaskStatus" NOT NULL DEFAULT 'ASSIGNED',
  "startAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3) NOT NULL,
  "reminderOffsets" INTEGER[] DEFAULT ARRAY[1440, 120, 0]::INTEGER[],
  "blockedReason" TEXT,
  "submissionNote" TEXT,
  "reviewComment" TEXT,
  "startedAt" TIMESTAMP(3),
  "blockedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskResource" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "uploaderId" TEXT NOT NULL,
  "type" "TaskResourceType" NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT,
  "fileName" TEXT,
  "mimeType" TEXT,
  "size" INTEGER,
  "data" BYTEA,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskResource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskComment" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskActivity" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskReminderDelivery" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskReminderDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Task_taskCode_key" ON "Task"("taskCode");
CREATE INDEX "Task_assigneeId_status_idx" ON "Task"("assigneeId", "status");
CREATE INDEX "Task_assignedById_status_idx" ON "Task"("assignedById", "status");
CREATE INDEX "Task_status_dueAt_idx" ON "Task"("status", "dueAt");
CREATE INDEX "Task_dueAt_idx" ON "Task"("dueAt");
CREATE INDEX "TaskResource_taskId_idx" ON "TaskResource"("taskId");
CREATE INDEX "TaskResource_uploaderId_idx" ON "TaskResource"("uploaderId");
CREATE INDEX "TaskComment_taskId_createdAt_idx" ON "TaskComment"("taskId", "createdAt");
CREATE INDEX "TaskComment_authorId_idx" ON "TaskComment"("authorId");
CREATE INDEX "TaskActivity_taskId_createdAt_idx" ON "TaskActivity"("taskId", "createdAt");
CREATE INDEX "TaskActivity_actorId_idx" ON "TaskActivity"("actorId");
CREATE UNIQUE INDEX "TaskReminderDelivery_taskId_userId_kind_scheduledFor_key" ON "TaskReminderDelivery"("taskId", "userId", "kind", "scheduledFor");
CREATE INDEX "TaskReminderDelivery_userId_sentAt_idx" ON "TaskReminderDelivery"("userId", "sentAt");
CREATE INDEX "TaskReminderDelivery_taskId_idx" ON "TaskReminderDelivery"("taskId");

ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskResource" ADD CONSTRAINT "TaskResource_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskResource" ADD CONSTRAINT "TaskResource_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskReminderDelivery" ADD CONSTRAINT "TaskReminderDelivery_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskReminderDelivery" ADD CONSTRAINT "TaskReminderDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
