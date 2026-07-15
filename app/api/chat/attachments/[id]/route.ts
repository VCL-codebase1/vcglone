import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const attachment = await prisma.chatAttachment.findFirst({
    where: {
      id: params.id,
      message: { deletedAt: null, conversation: { members: { some: { userId: session.user.id } } } }
    }
  });
  if (!attachment) return NextResponse.json({ message: "Attachment not found." }, { status: 404 });

  const safeFileName = attachment.fileName.replace(/[\r\n"\\]/g, "_");
  const disposition = attachment.mimeType.startsWith("image/") || attachment.mimeType === "application/pdf" ? "inline" : "attachment";
  const body = new Uint8Array(attachment.data.byteLength);
  body.set(attachment.data);
  return new NextResponse(body.buffer, {
    headers: {
      "Content-Type": attachment.mimeType || "application/octet-stream",
      "Content-Length": String(attachment.size),
      "Content-Disposition": `${disposition}; filename="${safeFileName}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
