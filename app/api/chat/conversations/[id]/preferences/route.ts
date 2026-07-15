import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const preferenceSchema = z.object({
  pinned: z.boolean().optional(),
  muted: z.boolean().optional(),
  archived: z.boolean().optional()
}).refine((value) => Object.keys(value).length > 0, "Choose a preference to update.");

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const parsed = preferenceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid preference." }, { status: 400 });

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: params.id, userId: session.user.id } },
    select: { id: true }
  });
  if (!membership) return NextResponse.json({ message: "Conversation not found." }, { status: 404 });

  await prisma.conversationMember.update({
    where: { id: membership.id },
    data: {
      pinnedAt: parsed.data.pinned === undefined ? undefined : parsed.data.pinned ? new Date() : null,
      muted: parsed.data.muted,
      archivedAt: parsed.data.archived === undefined ? undefined : parsed.data.archived ? new Date() : null
    }
  });
  return NextResponse.json({ ok: true });
}
