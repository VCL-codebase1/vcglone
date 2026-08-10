import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const canViewDrafts = session.user.role === Role.HR_ADMIN || session.user.role === Role.SUPER_ADMIN;
  const document = await prisma.knowledgeDocument.findFirst({ where: { id: params.id, published: canViewDrafts ? undefined : true } });
  if (!document) return NextResponse.json({ message: "Document not found." }, { status: 404 });

  const safeFileName = document.fileName.replace(/[\r\n"\\]/g, "_");
  const inline = document.mimeType === "application/pdf" || document.mimeType.startsWith("text/");
  const body = new Uint8Array(document.data.byteLength);
  body.set(document.data);
  return new NextResponse(body.buffer, {
    headers: {
      "Content-Type": document.mimeType || "application/octet-stream",
      "Content-Length": String(document.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeFileName}"; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
