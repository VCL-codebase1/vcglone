ALTER TABLE "ChatMessage"
ADD COLUMN "replyToId" TEXT;

CREATE INDEX "ChatMessage_replyToId_idx" ON "ChatMessage"("replyToId");

ALTER TABLE "ChatMessage"
ADD CONSTRAINT "ChatMessage_replyToId_fkey"
FOREIGN KEY ("replyToId") REFERENCES "ChatMessage"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ConversationMember"
ADD COLUMN "pinnedAt" TIMESTAMP(3),
ADD COLUMN "muted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "archivedAt" TIMESTAMP(3);
