import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/rbac";

const nav = [
  { href: "/manager/dashboard", label: "Dashboard", icon: "dashboard" as const },
  { href: "/employee/attendance", label: "My Attendance", icon: "attendance" as const },
  { href: "/employee/attendance/history", label: "My History", icon: "reports" as const },
  { href: "/employee/leave", label: "My Leave", icon: "leave" as const },
  { href: "/employee/profile", label: "My Profile", icon: "users" as const },
  { href: "/manager/team", label: "Team", icon: "users" as const },
  { href: "/manager/attendance", label: "Team Attendance", icon: "attendance" as const },
  { href: "/manager/leave-approvals", label: "Team Leave", icon: "leave" as const },
  { href: "/manager/leave-calendar", label: "Calendar", icon: "reports" as const }
];

export const dynamic = "force-dynamic";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  await requireRole([Role.MANAGER, Role.HR_ADMIN, Role.SUPER_ADMIN]);
  return <DashboardShell area="Manager workspace" nav={nav}>{children}</DashboardShell>;
}


