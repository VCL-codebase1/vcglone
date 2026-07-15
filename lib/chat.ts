import { ConversationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { roleChat } from "@/lib/routes";

export const EVERYONE_CHAT_SLUG = "everyone";

export async function ensureEveryoneConversation() {
  const activeUsers = await prisma.user.findMany({
    where: { employmentStatus: "ACTIVE" },
    select: { id: true }
  });
  const activeUserIds = activeUsers.map((user) => user.id);
  let conversation = await prisma.conversation.findUnique({
    where: { slug: EVERYONE_CHAT_SLUG },
    include: { members: { select: { userId: true } } }
  });

  if (!conversation) {
    try {
      return await prisma.conversation.create({
        data: {
          type: ConversationType.GROUP,
          name: "Everyone",
          slug: EVERYONE_CHAT_SLUG,
          members: { create: activeUserIds.map((userId) => ({ userId })) }
        }
      });
    } catch (error) {
      if ((error as { code?: string }).code !== "P2002") throw error;
      conversation = await prisma.conversation.findUnique({
        where: { slug: EVERYONE_CHAT_SLUG },
        include: { members: { select: { userId: true } } }
      });
    }
  }

  if (!conversation) throw new Error("Unable to initialize the Everyone conversation.");
  const existingMemberIds = new Set(conversation.members.map((member) => member.userId));
  const missingMemberIds = activeUserIds.filter((userId) => !existingMemberIds.has(userId));
  if (missingMemberIds.length) {
    await prisma.conversationMember.createMany({
      data: missingMemberIds.map((userId) => ({ conversationId: conversation!.id, userId })),
      skipDuplicates: true
    });
  }
  return conversation;
}

export async function getChatNotificationStatus(userId: string, role?: string | null) {
  const memberships = await prisma.conversationMember.findMany({
    where: { userId },
    select: { conversationId: true, lastReadAt: true }
  });

  if (!memberships.length) return { unreadCount: 0, latest: null };

  const unreadWhere = {
    deletedAt: null,
    senderId: { not: userId },
    OR: memberships.map((membership) => ({
      conversationId: membership.conversationId,
      createdAt: { gt: membership.lastReadAt }
    }))
  };
  const [unreadCount, latestMessage] = await prisma.$transaction([
    prisma.chatMessage.count({ where: unreadWhere }),
    prisma.chatMessage.findFirst({
      where: unreadWhere,
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { firstName: true, lastName: true } },
        conversation: { select: { id: true, type: true, name: true, slug: true } },
        _count: { select: { attachments: true } }
      }
    })
  ]);

  if (!latestMessage) return { unreadCount, latest: null };
  const conversationTitle = latestMessage.conversation.slug === EVERYONE_CHAT_SLUG
    ? "Everyone"
    : latestMessage.conversation.type === ConversationType.GROUP
      ? latestMessage.conversation.name || "group chat"
      : `${latestMessage.sender.firstName} ${latestMessage.sender.lastName}`;
  const message = latestMessage.body
    || (latestMessage._count.attachments === 1 ? "Sent an attachment." : `Sent ${latestMessage._count.attachments} attachments.`);

  return {
    unreadCount,
    latest: {
      id: latestMessage.id,
      title: latestMessage.conversation.type === ConversationType.GROUP
        ? `New message in ${conversationTitle}`
        : `New message from ${conversationTitle}`,
      message,
      href: `${roleChat(role)}?conversation=${encodeURIComponent(latestMessage.conversation.id)}`,
      createdAt: latestMessage.createdAt
    }
  };
}
