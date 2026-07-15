import { ConversationType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q")?.trim();
  const conversationId = new URL(request.url).searchParams.get("conversation")?.trim();
  if (!query || query.length < 2) return NextResponse.json({ results: [] });

  const messages = await prisma.chatMessage.findMany({
    where: {
      deletedAt: null,
      body: { contains: query, mode: "insensitive" },
      conversationId: conversationId || undefined,
      conversation: { members: { some: { userId: session.user.id } } }
    },
    include: {
      sender: { select: { firstName: true, lastName: true } },
      conversation: {
        include: { members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return NextResponse.json({
    results: messages.map((message) => {
      const otherMembers = message.conversation.members.filter((member) => member.userId !== session.user.id);
      const conversationTitle = message.conversation.type === ConversationType.GROUP
        ? message.conversation.name || "Group chat"
        : otherMembers.map((member) => `${member.user.firstName} ${member.user.lastName}`).join(", ") || "Direct chat";
      return {
        id: message.id,
        conversationId: message.conversationId,
        conversationTitle,
        body: message.body,
        senderName: `${message.sender.firstName} ${message.sender.lastName}`,
        createdAt: message.createdAt
      };
    })
  }, { headers: { "Cache-Control": "no-store" } });
}
