import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roleHome } from "@/lib/routes";

export const adminRoles = [Role.HR_ADMIN, Role.SUPER_ADMIN] as const;
export const managerRoles = [Role.MANAGER, Role.HR_ADMIN, Role.SUPER_ADMIN] as const;

export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(roleHome(user.role));
  return user;
}

export function canAdmin(role: Role) {
  return adminRoles.includes(role as (typeof adminRoles)[number]);
}

export function canManage(role: Role) {
  return managerRoles.includes(role as (typeof managerRoles)[number]);
}

export async function assertCanAccessEmployee(actorId: string, targetEmployeeId: string) {
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { id: true, role: true } });
  if (!actor) throw new Error("Unauthorized");
  if (actor.id === targetEmployeeId || canAdmin(actor.role)) return true;
  if (actor.role === Role.MANAGER) {
    const report = await prisma.user.findFirst({
      where: { id: targetEmployeeId, managerId: actor.id },
      select: { id: true }
    });
    if (report) return true;
  }
  throw new Error("Forbidden");
}
