import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/rbac";

const nav = [
  { href: "/manager/dashboard", label: "Dashboard", icon: "dashboard" as const },
  { href: "/manager/my-attendance", label: "My Attendance", icon: "attendance" as const },
  { href: "/manager/my-attendance/history", label: "My History", icon: "reports" as const },
  { href: "/manager/my-leave", label: "My Leave", icon: "leave" as const },
  { href: "/manager/my-tasks", label: "My Tasks", icon: "tasks" as const },
  { href: "/manager/chat", label: "Chat", icon: "chat" as const },
  { href: "/manager/profile", label: "My Profile", icon: "users" as const },
  { href: "/manager/team", label: "Team", icon: "users" as const },
  { href: "/manager/tasks", label: "Team Tasks", icon: "tasks" as const },
  { href: "/manager/tasks?status=IN_REVIEW", label: "Task Reviews", icon: "tasks" as const },
  { href: "/manager/task-reports", label: "Task Analytics", icon: "reports" as const },
  { href: "/manager/attendance", label: "Team Attendance", icon: "attendance" as const },
  { href: "/manager/leave-approvals", label: "Team Leave", icon: "leave" as const },
  { href: "/manager/leave-calendar", label: "Calendar", icon: "reports" as const }
];

export const dynamic = "force-dynamic";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  await requireRole([Role.MANAGER, Role.HR_ADMIN, Role.SUPER_ADMIN]);
  return <DashboardShell area="Manager portal" nav={nav}>{children}</DashboardShell>;
}


