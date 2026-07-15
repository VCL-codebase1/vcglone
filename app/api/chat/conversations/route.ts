import { ConversationType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const createConversationSchema = z.object({
  type: z.nativeEnum(ConversationType),
  name: z.string().trim().min(2).max(100).optional(),
  memberIds: z.array(z.string().min(1)).min(1).max(50)
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.conversationMember.findMany({
    where: { userId: session.user.id },
    include: {
      conversation: {
        include: {
          members: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, jobTitle: true, employmentStatus: true, chatLastSeenAt: true } }
            }
          },
          messages: {
            where: { deletedAt: null },
            include: {
              sender: { select: { id: true, firstName: true, lastName: true } },
              attachments: { select: { id: true } }
            },
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      }
    },
    orderBy: { conversation: { updatedAt: "desc" } }
  });

  const unreadCounts = memberships.length ? await prisma.chatMessage.groupBy({
    by: ["conversationId"],
    where: {
      deletedAt: null,
      senderId: { not: session.user.id },
      OR: memberships.map((membership) => ({
        conversationId: membership.conversationId,
        createdAt: { gt: membership.lastReadAt }
      }))
    },
    _count: { _all: true }
  }) : [];
  const unreadByConversation = new Map(unreadCounts.map((item) => [item.conversationId, item._count._all]));

  const conversations = memberships.map((membership) => {
    const conversation = membership.conversation;
    const otherMembers = conversation.members.filter((member) => member.userId !== session.user.id);
    const title = conversation.type === ConversationType.GROUP
      ? conversation.name || "Group chat"
      : otherMembers.map((member) => `${member.user.firstName} ${member.user.lastName}`).join(", ") || "Direct chat";
    const lastMessage = conversation.messages[0];

    return {
      id: conversation.id,
      type: conversation.type,
      title,
      everyone: conversation.slug === "everyone",
      canManage: conversation.type === ConversationType.GROUP && conversation.slug !== "everyone" && (conversation.createdById === session.user.id || ["HR_ADMIN", "SUPER_ADMIN"].includes(session.user.role)),
      updatedAt: conversation.updatedAt,
      unreadCount: unreadByConversation.get(conversation.id) || 0,
      members: conversation.members.map((member) => ({
        id: member.user.id,
        name: `${member.user.firstName} ${member.user.lastName}`,
        jobTitle: member.user.jobTitle,
        active: member.user.employmentStatus === "ACTIVE",
        online: Boolean(member.user.chatLastSeenAt && member.user.chatLastSeenAt > new Date(Date.now() - 70_000)),
        lastSeenAt: member.user.chatLastSeenAt
      })),
      lastMessage: lastMessage ? {
        body: lastMessage.body || (lastMessage.attachments.length === 1 ? "Sent an attachment" : `Sent ${lastMessage.attachments.length} attachments`),
        senderName: lastMessage.senderId === session.user.id ? "You" : lastMessage.sender.firstName,
        createdAt: lastMessage.createdAt
      } : null
    };
  });

  return NextResponse.json({ conversations }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = createConversationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid conversation." }, { status: 400 });

  const memberIds = Array.from(new Set(parsed.data.memberIds.filter((id) => id !== session.user.id)));
  if (parsed.data.type === ConversationType.DIRECT && memberIds.length !== 1) {
    return NextResponse.json({ message: "Select one person for a direct chat." }, { status: 400 });
  }
  if (parsed.data.type === ConversationType.GROUP && (!parsed.data.name || memberIds.length < 1)) {
    return NextResponse.json({ message: "Add a group name and at least one other member." }, { status: 400 });
  }

  const validMembers = await prisma.user.findMany({
    where: { id: { in: memberIds }, employmentStatus: "ACTIVE" },
    select: { id: true }
  });
  if (validMembers.length !== memberIds.length) return NextResponse.json({ message: "One or more selected members are unavailable." }, { status: 400 });

  const allMemberIds = [session.user.id, ...memberIds];
  const directKey = parsed.data.type === ConversationType.DIRECT ? [...allMemberIds].sort().join(":") : null;
  if (directKey) {
    const existing = await prisma.conversation.findUnique({ where: { directKey }, select: { id: true } });
    if (existing) return NextResponse.json({ conversation: existing });
  }

  let conversation: { id: string };
  try {
    conversation = await prisma.conversation.create({
      data: {
        type: parsed.data.type,
        name: parsed.data.type === ConversationType.GROUP ? parsed.data.name : null,
        directKey,
        createdById: session.user.id,
        members: { create: allMemberIds.map((userId) => ({ userId })) }
      },
      select: { id: true }
    });
  } catch (error) {
    if (!directKey || (error as { code?: string }).code !== "P2002") throw error;
    const existing = await prisma.conversation.findUnique({ where: { directKey }, select: { id: true } });
    if (!existing) throw error;
    return NextResponse.json({ conversation: existing });
  }

  await createAuditLog({
    actorId: session.user.id,
    action: "CHAT_CONVERSATION_CREATED",
    entityType: "Conversation",
    entityId: conversation.id,
    metadata: { type: parsed.data.type, memberCount: allMemberIds.length }
  });

  return NextResponse.json({ conversation }, { status: 201 });
}
