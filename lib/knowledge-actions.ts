"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { KNOWLEDGE_CATEGORIES } from "@/lib/knowledge-base";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"]);

export type KnowledgeUploadState = { ok: boolean; message: string };

function revalidateKnowledgeBase() {
  revalidatePath("/admin/knowledge-base");
  revalidatePath("/manager/knowledge-base");
  revalidatePath("/employee/knowledge-base");
}

export async function uploadKnowledgeDocument(
  _previousState: KnowledgeUploadState,
  formData: FormData
): Promise<KnowledgeUploadState> {
  const actor = await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const category = String(formData.get("category") || "");
  const file = formData.get("document");

  if (title.length < 3 || title.length > 160) return { ok: false, message: "Enter a title between 3 and 160 characters." };
  if (!KNOWLEDGE_CATEGORIES.includes(category as never)) return { ok: false, message: "Choose a valid document category." };
  if (!(file instanceof File) || !file.size) return { ok: false, message: "Choose a document to upload." };
  if (file.size > MAX_FILE_SIZE) return { ok: false, message: "The document must be 10 MB or smaller." };
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.has(extension)) return { ok: false, message: "Upload a PDF, Word, Excel, PowerPoint, text, or CSV document." };

  const document = await prisma.knowledgeDocument.create({
    data: {
      title,
      description: description || null,
      category,
      fileName: file.name.slice(0, 255),
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      data: Buffer.from(await file.arrayBuffer()),
      published: formData.get("published") === "on",
      uploaderId: actor.id
    }
  });
  await createAuditLog({
    actorId: actor.id,
    action: "KNOWLEDGE_DOCUMENT_UPLOADED",
    entityType: "KnowledgeDocument",
    entityId: document.id,
    metadata: { title: document.title, category: document.category, published: document.published }
  });
  revalidateKnowledgeBase();
  return { ok: true, message: "Document uploaded successfully." };
}

export async function setKnowledgeDocumentPublished(formData: FormData) {
  const actor = await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const id = String(formData.get("id") || "");
  const published = formData.get("published") === "true";
  const document = await prisma.knowledgeDocument.update({ where: { id }, data: { published }, select: { title: true } });
  await createAuditLog({ actorId: actor.id, action: published ? "KNOWLEDGE_DOCUMENT_PUBLISHED" : "KNOWLEDGE_DOCUMENT_UNPUBLISHED", entityType: "KnowledgeDocument", entityId: id, metadata: { title: document.title } });
  revalidateKnowledgeBase();
}

export async function deleteKnowledgeDocument(formData: FormData) {
  const actor = await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const id = String(formData.get("id") || "");
  const document = await prisma.knowledgeDocument.delete({ where: { id }, select: { title: true, category: true } });
  await createAuditLog({ actorId: actor.id, action: "KNOWLEDGE_DOCUMENT_DELETED", entityType: "KnowledgeDocument", entityId: id, metadata: { title: document.title, category: document.category } });
  revalidateKnowledgeBase();
}
