import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const reactionSchema = z.object({ emoji: z.enum(["👍", "❤️", "😂", "🎉", "👀", "🙏"]) });

export async function POST(request: Request, { params }: { params: { id: string; messageId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const parsed = reactionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Unsupported reaction." }, { status: 400 });
  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: params.id, userId: session.user.id } },
    select: { id: true }
  });
  if (!membership) return NextResponse.json({ message: "Conversation not found." }, { status: 404 });
  const message = await prisma.chatMessage.findFirst({ where: { id: params.messageId, conversationId: params.id, deletedAt: null }, select: { id: true } });
  if (!message) return NextResponse.json({ message: "Message not found." }, { status: 404 });

  const key = { messageId_userId_emoji: { messageId: message.id, userId: session.user.id, emoji: parsed.data.emoji } };
  const existing = await prisma.chatReaction.findUnique({ where: key, select: { id: true } });
  if (existing) await prisma.chatReaction.delete({ where: { id: existing.id } });
  else await prisma.chatReaction.create({ data: { messageId: message.id, userId: session.user.id, emoji: parsed.data.emoji } });
  return NextResponse.json({ active: !existing });
}
