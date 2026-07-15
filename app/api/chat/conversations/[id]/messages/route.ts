import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { createNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { roleChat } from "@/lib/routes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const messageSchema = z.object({ body: z.string().trim().max(4000, "Messages are limited to 4,000 characters.") });
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;
const allowedMimeTypes = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "text/plain",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip", "application/x-zip-compressed"
]);
const allowedExtensions = new Set(["jpg", "jpeg", "png", "gif", "webp", "pdf", "txt", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip"]);

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
    include: {
      sender: { select: { id: true, firstName: true, lastName: true } },
      attachments: { select: { id: true, fileName: true, mimeType: true, size: true } },
      reactions: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }
    },
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
  const members = await prisma.conversationMember.findMany({
    where: { conversationId: params.id },
    include: { user: { select: { id: true, firstName: true, lastName: true } } }
  });
  const typingMembers = members
    .filter((member) => member.userId !== session.user.id && member.typingUntil && member.typingUntil > new Date())
    .map((member) => `${member.user.firstName} ${member.user.lastName}`);

  return NextResponse.json({
    messages: orderedMessages.map((message) => {
      const reactions = Array.from(new Set(message.reactions.map((reaction) => reaction.emoji))).map((emoji) => {
        const matching = message.reactions.filter((reaction) => reaction.emoji === emoji);
        return {
          emoji,
          count: matching.length,
          mine: matching.some((reaction) => reaction.userId === session.user.id),
          names: matching.map((reaction) => `${reaction.user.firstName} ${reaction.user.lastName}`)
        };
      });
      return {
        id: message.id,
        body: message.body,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        edited: message.updatedAt.getTime() - message.createdAt.getTime() > 1_000,
        mine: message.senderId === session.user.id,
        sender: { id: message.sender.id, name: `${message.sender.firstName} ${message.sender.lastName}` },
        attachments: message.attachments.map((attachment) => ({ ...attachment, url: `/api/chat/attachments/${attachment.id}` })),
        reactions,
        readBy: members
          .filter((member) => member.userId !== message.senderId && member.lastReadAt >= message.createdAt)
          .map((member) => `${member.user.firstName} ${member.user.lastName}`)
      };
    }),
    hasMore: messages.length === 50,
    typingMembers
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const membership = await getMembership(params.id, session.user.id);
  if (!membership) return NextResponse.json({ message: "Conversation not found." }, { status: 404 });
  let rawBody: unknown;
  let files: File[] = [];
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const formData = await request.formData();
    rawBody = { body: String(formData.get("body") || "") };
    files = formData.getAll("files").filter((item): item is File => item instanceof File);
  } else {
    rawBody = await request.json().catch(() => null);
  }
  const parsed = messageSchema.safeParse(rawBody);
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid message." }, { status: 400 });
  if (!parsed.data.body && !files.length) return NextResponse.json({ message: "Write a message or attach a file." }, { status: 400 });
  if (files.length > MAX_FILES) return NextResponse.json({ message: `Attach no more than ${MAX_FILES} files at once.` }, { status: 400 });
  const invalidFile = files.find((file) => {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    return file.size > MAX_FILE_SIZE || (!allowedMimeTypes.has(file.type) && !allowedExtensions.has(extension));
  });
  if (invalidFile) return NextResponse.json({ message: `${invalidFile.name} is unsupported or larger than 5 MB.` }, { status: 400 });
  const attachmentData = await Promise.all(files.map(async (file) => ({
    fileName: file.name.slice(0, 255),
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    data: Buffer.from(await file.arrayBuffer())
  })));

  const [message] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        conversationId: params.id,
        senderId: session.user.id,
        body: parsed.data.body,
        attachments: attachmentData.length ? { create: attachmentData } : undefined
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        attachments: { select: { id: true, fileName: true, mimeType: true, size: true } }
      }
    }),
    prisma.conversation.update({ where: { id: params.id }, data: { updatedAt: new Date() } })
  ]);

  await prisma.conversationMember.update({ where: { id: membership.id }, data: { lastReadAt: message.createdAt } });

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: { user: { select: { id: true, role: true, employmentStatus: true, chatLastSeenAt: true } } }
      }
    }
  });
  if (conversation) {
    const offlineRecipients = conversation.members.filter((member) => (
      member.userId !== session.user.id
      && member.user.employmentStatus === "ACTIVE"
      && (!member.user.chatLastSeenAt || member.user.chatLastSeenAt < new Date(Date.now() - 70_000))
    ));
    if (offlineRecipients.length) {
      await createNotifications(offlineRecipients.map((member) => ({
          userId: member.userId,
          title: conversation.slug === "everyone"
            ? "New message in Everyone"
            : conversation.type === "GROUP" ? `New message in ${conversation.name || "group chat"}` : `New message from ${session.user.firstName}`,
          message: parsed.data.body.slice(0, 160) || (message.attachments.length === 1 ? "Sent an attachment." : `Sent ${message.attachments.length} attachments.`),
          href: roleChat(member.user.role)
        })));
    }
  }

  return NextResponse.json({
    message: {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      mine: true,
      edited: false,
      sender: { id: message.sender.id, name: `${message.sender.firstName} ${message.sender.lastName}` },
      attachments: message.attachments.map((attachment) => ({ ...attachment, url: `/api/chat/attachments/${attachment.id}` })),
      reactions: [],
      readBy: []
    }
  }, { status: 201 });
}
