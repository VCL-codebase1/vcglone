import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/rbac";

const adminNav = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard" as const },
  { href: "/admin/employees", label: "Employees", icon: "users" as const },
  { href: "/admin/departments", label: "Departments", icon: "users" as const },
  { href: "/admin/attendance", label: "Attendance", icon: "attendance" as const },
  { href: "/admin/leave-requests", label: "Leave Requests", icon: "leave" as const },
  { href: "/admin/leave-types", label: "Leave Types", icon: "settings" as const },
  { href: "/admin/reports", label: "Reports", icon: "reports" as const },
  { href: "/admin/settings", label: "Settings", icon: "settings" as const },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: "reports" as const }
];

const hrSelfServiceNav = [
  { href: "/employee/attendance", label: "My Attendance", icon: "attendance" as const },
  { href: "/employee/attendance/history", label: "My History", icon: "reports" as const },
  { href: "/employee/leave", label: "My Leave", icon: "leave" as const },
  { href: "/employee/profile", label: "My Profile", icon: "users" as const }
];

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  const nav = actor.role === Role.HR_ADMIN ? [...hrSelfServiceNav, ...adminNav] : adminNav;
  return <DashboardShell area="Admin console" nav={nav}>{children}</DashboardShell>;
}


