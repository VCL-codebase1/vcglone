"use client";

import { BookOpen, CalendarCheck, ClipboardList, FileText, LayoutDashboard, ListChecks, MessageSquare, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navIcons = { dashboard: LayoutDashboard, attendance: CalendarCheck, leave: ClipboardList, users: Users, reports: FileText, settings: Settings, chat: MessageSquare, tasks: ListChecks, knowledge: BookOpen };

export function DashboardNavLink({ href, label, icon, mobile = false }: { href: string; label: string; icon: keyof typeof navIcons; mobile?: boolean }) {
  const pathname = usePathname();
  const Icon = navIcons[icon];
  const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring group relative flex items-center gap-3 rounded-md border-l-2 px-3 text-sm transition",
        mobile ? "min-h-11 py-2.5" : "min-h-10 py-2",
        active
          ? "border-brand bg-brandSoft/70 font-semibold text-brand"
          : "border-transparent font-medium text-slate-600 hover:bg-surface hover:text-ink"
      )}
    >
      <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand" : "text-slate-400 group-hover:text-slate-600")} aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
