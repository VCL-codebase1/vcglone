CREATE TABLE "KnowledgeDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "uploaderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KnowledgeDocument_published_category_createdAt_idx"
ON "KnowledgeDocument"("published", "category", "createdAt");

CREATE INDEX "KnowledgeDocument_uploaderId_idx"
ON "KnowledgeDocument"("uploaderId");

ALTER TABLE "KnowledgeDocument"
ADD CONSTRAINT "KnowledgeDocument_uploaderId_fkey"
FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
