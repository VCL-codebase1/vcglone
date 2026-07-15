import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getNotificationStatus } from "@/lib/notifications";
import { ensureTaskRemindersForUser } from "@/lib/task-reminders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await ensureTaskRemindersForUser({ id: session.user.id, role: session.user.role });
  const status = await getNotificationStatus(session.user.id);
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
