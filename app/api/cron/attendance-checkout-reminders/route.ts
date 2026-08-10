import { NextResponse } from "next/server";
import { sendCheckoutReminders } from "@/lib/attendance-reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const result = await sendCheckoutReminders();
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
