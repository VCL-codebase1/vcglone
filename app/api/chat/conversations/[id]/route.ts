import { ConversationType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  memberIds: z.array(z.string().min(1)).min(1).max(50)
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid group settings." }, { status: 400 });

  const conversation = await prisma.conversation.findUnique({ where: { id: params.id }, select: { id: true, type: true, slug: true, createdById: true } });
  if (!conversation || conversation.type !== ConversationType.GROUP || conversation.slug === "everyone") {
    return NextResponse.json({ message: "Group conversation not found." }, { status: 404 });
  }
  const canManage = conversation.createdById === session.user.id || ["HR_ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  if (!canManage) return NextResponse.json({ message: "You cannot manage this group." }, { status: 403 });

  const requestedMemberIds = Array.from(new Set([session.user.id, ...parsed.data.memberIds]));
  if (conversation.createdById) requestedMemberIds.push(conversation.createdById);
  const memberIds = Array.from(new Set(requestedMemberIds));
  const validUsers = await prisma.user.findMany({ where: { id: { in: memberIds }, employmentStatus: "ACTIVE" }, select: { id: true } });
  if (validUsers.length !== memberIds.length) return NextResponse.json({ message: "One or more selected members are unavailable." }, { status: 400 });

  await prisma.$transaction([
    prisma.conversation.update({ where: { id: conversation.id }, data: { name: parsed.data.name } }),
    prisma.conversationMember.deleteMany({ where: { conversationId: conversation.id, userId: { notIn: memberIds } } }),
    prisma.conversationMember.createMany({ data: memberIds.map((userId) => ({ conversationId: conversation.id, userId })), skipDuplicates: true })
  ]);
  return NextResponse.json({ ok: true });
}
