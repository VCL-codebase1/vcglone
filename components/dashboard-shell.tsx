import { CalendarCheck, ClipboardList, FileText, LayoutDashboard, LogOut, Settings, Users } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

const iconMap = {
  dashboard: LayoutDashboard,
  attendance: CalendarCheck,
  leave: ClipboardList,
  users: Users,
  reports: FileText,
  settings: Settings
};

type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof iconMap;
};

export async function DashboardShell({
  children,
  nav,
  area
}: {
  children: React.ReactNode;
  nav: NavItem[];
  area: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen min-w-0 bg-surface">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-line bg-white px-4 py-5 lg:flex">
        <div className="shrink-0">
          <Link href="/" className="block rounded-md px-3 py-2">
            <p className="text-lg font-bold text-ink">vcglOne</p>
            <p className="text-xs font-medium text-muted">{area}</p>
          </Link>
        </div>
        <nav className="mt-8 min-h-0 flex-1 space-y-1 overflow-y-auto pb-4 pr-1">
          {nav.map((item) => {
            const Icon = iconMap[item.icon];
            return (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-surface">
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 shrink-0 rounded-lg border border-line bg-surface p-3 text-sm">
          <p className="font-semibold text-ink">{session.user.firstName} {session.user.lastName}</p>
          <p className="text-xs text-muted">{session.user.role.replace("_", " ")}</p>
          <Link href="/api/auth/signout" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-danger">
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Sign out
          </Link>
        </div>
      </aside>
      <header className="sticky top-0 z-10 border-b border-line bg-white/95 px-3 py-3 backdrop-blur sm:px-4 lg:hidden">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <Link href="/" className="font-bold text-ink">vcglOne</Link>
          <Link href="/api/auth/signout" className="shrink-0 text-sm font-semibold text-danger">Sign out</Link>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="shrink-0 rounded-md border border-line bg-white px-3 py-2 text-xs font-medium text-slate-700">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="min-w-0 px-3 py-5 sm:px-4 sm:py-6 lg:ml-72 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-[1600px] min-w-0">{children}</div>
      </main>
    </div>
  );
}


