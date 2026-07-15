import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    where: { id: { not: session.user.id }, employmentStatus: "ACTIVE" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeId: true,
      jobTitle: true,
      role: true,
      department: { select: { name: true } }
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
  });

  return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store" } });
}
