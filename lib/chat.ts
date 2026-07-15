import { ConversationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
