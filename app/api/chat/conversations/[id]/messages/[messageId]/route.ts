import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const editSchema = z.object({ body: z.string().trim().min(1).max(4000) });

async function editableMessage(conversationId: string, messageId: string, userId: string) {
  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { id: true }
  });
  if (!membership) return null;
  return prisma.chatMessage.findFirst({ where: { id: messageId, conversationId, senderId: userId, deletedAt: null } });
}

export async function PATCH(request: Request, { params }: { params: { id: string; messageId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const parsed = editSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid message." }, { status: 400 });
  const message = await editableMessage(params.id, params.messageId, session.user.id);
  if (!message) return NextResponse.json({ message: "Message not found." }, { status: 404 });
  const updated = await prisma.chatMessage.update({ where: { id: message.id }, data: { body: parsed.data.body } });
  return NextResponse.json({ message: { id: updated.id, body: updated.body, updatedAt: updated.updatedAt } });
}

export async function DELETE(_request: Request, { params }: { params: { id: string; messageId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const message = await editableMessage(params.id, params.messageId, session.user.id);
  if (!message) return NextResponse.json({ message: "Message not found." }, { status: 404 });
  await prisma.chatMessage.update({ where: { id: message.id }, data: { deletedAt: new Date(), body: "" } });
  return NextResponse.json({ ok: true });
}
