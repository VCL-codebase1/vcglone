import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTask } from "@/lib/tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const resource = await prisma.taskResource.findUnique({ where: { id: params.id }, include: { task: true } });
  if (!resource || !(await canAccessTask(session.user, resource.task))) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (!resource.data) return NextResponse.json({ message: "File unavailable" }, { status: 404 });
  return new NextResponse(new Blob([new Uint8Array(resource.data)]), {
    headers: {
      "Content-Type": resource.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(resource.fileName || resource.title)}`,
      "Content-Length": String(resource.size || resource.data.byteLength),
      "Cache-Control": "private, max-age=300"
    }
  });
}
