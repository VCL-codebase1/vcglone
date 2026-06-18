import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/rbac";

const nav = [
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

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole([Role.HR_ADMIN, Role.SUPER_ADMIN]);
  return <DashboardShell area="Admin console" nav={nav}>{children}</DashboardShell>;
}
