import type { Role } from "@prisma/client";

export function roleHome(role?: Role | string | null) {
  if (role === "SUPER_ADMIN" || role === "HR_ADMIN") return "/admin/dashboard";
  if (role === "MANAGER") return "/manager/dashboard";
  return "/employee/dashboard";
}

export function roleNotifications(role?: Role | string | null) {
  if (role === "SUPER_ADMIN" || role === "HR_ADMIN") return "/admin/notifications";
  if (role === "MANAGER") return "/manager/notifications";
  return "/employee/notifications";
}
