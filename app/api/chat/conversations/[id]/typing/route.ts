import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const typingSchema = z.object({ typing: z.boolean() });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const parsed = typingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid typing state." }, { status: 400 });

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: params.id, userId: session.user.id } },
    select: { id: true }
  });
  if (!membership) return NextResponse.json({ message: "Conversation not found." }, { status: 404 });

  await prisma.conversationMember.update({
    where: { id: membership.id },
    data: { typingUntil: parsed.data.typing ? new Date(Date.now() + 6_000) : null }
  });
  return NextResponse.json({ ok: true });
}
