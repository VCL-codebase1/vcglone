import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getChatNotificationStatus } from "@/lib/chat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const status = await getChatNotificationStatus(session.user.id, session.user.role);
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
