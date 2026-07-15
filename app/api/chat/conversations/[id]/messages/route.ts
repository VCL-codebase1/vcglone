import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const messageSchema = z.object({ body: z.string().trim().min(1, "Write a message.").max(4000, "Messages are limited to 4,000 characters.") });

async function getMembership(conversationId: string, userId: string) {
  return prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } }
  });
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const membership = await getMembership(params.id, session.user.id);
  if (!membership) return NextResponse.json({ message: "Conversation not found." }, { status: 404 });

  const beforeValue = new URL(request.url).searchParams.get("before");
  const before = beforeValue ? new Date(beforeValue) : undefined;
  if (before && Number.isNaN(before.getTime())) return NextResponse.json({ message: "Invalid message cursor." }, { status: 400 });

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId: params.id, deletedAt: null, createdAt: before ? { lt: before } : undefined },
    include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  const orderedMessages = messages.reverse();
  const newestMessage = orderedMessages[orderedMessages.length - 1];
  if (newestMessage && newestMessage.createdAt > membership.lastReadAt) {
    await prisma.conversationMember.update({
      where: { id: membership.id },
      data: { lastReadAt: newestMessage.createdAt }
    });
  }

  return NextResponse.json({
    messages: orderedMessages.map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      mine: message.senderId === session.user.id,
      sender: { id: message.sender.id, name: `${message.sender.firstName} ${message.sender.lastName}` }
    })),
    hasMore: messages.length === 50
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const [membership, parsed] = await Promise.all([
    getMembership(params.id, session.user.id),
    request.json().then((body) => messageSchema.safeParse(body)).catch(() => messageSchema.safeParse(null))
  ]);
  if (!membership) return NextResponse.json({ message: "Conversation not found." }, { status: 404 });
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid message." }, { status: 400 });

  const [message] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: { conversationId: params.id, senderId: session.user.id, body: parsed.data.body },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } }
    }),
    prisma.conversation.update({ where: { id: params.id }, data: { updatedAt: new Date() } })
  ]);

  await prisma.conversationMember.update({ where: { id: membership.id }, data: { lastReadAt: message.createdAt } });

  return NextResponse.json({
    message: {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      mine: true,
      sender: { id: message.sender.id, name: `${message.sender.firstName} ${message.sender.lastName}` }
    }
  }, { status: 201 });
}
