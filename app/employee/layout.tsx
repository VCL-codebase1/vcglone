import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/rbac";

const nav = [
  { href: "/employee/dashboard", label: "Dashboard", icon: "dashboard" as const },
  { href: "/employee/attendance", label: "Attendance", icon: "attendance" as const },
  { href: "/employee/attendance/history", label: "History", icon: "reports" as const },
  { href: "/employee/leave", label: "Leave", icon: "leave" as const },
  { href: "/employee/profile", label: "Profile", icon: "users" as const }
];

export const dynamic = "force-dynamic";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  await requireRole([Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN, Role.SUPER_ADMIN]);
  return <DashboardShell area="Employee workspace" nav={nav}>{children}</DashboardShell>;
}
