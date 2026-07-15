import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { roleNotifications } from "@/lib/routes";

export const runtime = "nodejs";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await createNotification({
    userId: session.user.id,
    title: "Phone notifications are working",
    message: "vcglOne can now notify this device about attendance, leave, account, and chat updates.",
    href: roleNotifications(session.user.role)
  });
  return NextResponse.json({ sent: true });
}
