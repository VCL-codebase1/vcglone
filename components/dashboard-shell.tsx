import { CalendarCheck, ClipboardList, FileText, LayoutDashboard, LogOut, Menu, Settings, Users } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { NotificationCenter } from "@/components/notification-center";
import { Button, Drawer, DrawerContent, DrawerTrigger, Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui";
import { authOptions } from "@/lib/auth";
import { getRecentNotifications, getUnreadNotificationCount } from "@/lib/notifications";

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
  const [notifications, unreadCount] = await Promise.all([
    getRecentNotifications(session.user.id),
    getUnreadNotificationCount(session.user.id)
  ]);

  return (
    <div className="min-h-screen min-w-0 bg-transparent">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-white/70 bg-white/85 px-4 py-5 shadow-[10px_0_40px_rgba(23,32,51,0.04)] backdrop-blur-xl lg:flex">
        <div className="shrink-0">
          <Link href="/" className="block rounded-2xl px-2 py-2 transition hover:bg-surface/70">
            <BrandLogo imageClassName="max-h-16 w-auto max-w-[13rem]" priority />
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">{area}</p>
          </Link>
        </div>
        <nav className="mt-8 min-h-0 flex-1 space-y-1 overflow-y-auto pb-4 pr-1">
          {nav.map((item) => {
            const Icon = iconMap[item.icon];
            return (
              <Link key={item.href} href={item.href} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-brandSoft hover:text-brand">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-muted transition group-hover:bg-white group-hover:text-brand">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mb-3 shrink-0">
          <NotificationCenter notifications={notifications} unreadCount={unreadCount} />
        </div>
        <div className="mt-4 shrink-0 rounded-2xl border border-white/70 bg-gradient-to-br from-brandSoft to-white p-4 text-sm shadow-[0_12px_32px_rgba(23,32,51,0.06)] ring-1 ring-line/70">
          <p className="font-semibold text-ink">{session.user.firstName} {session.user.lastName}</p>
          <p className="text-xs text-muted">{session.user.role.replace("_", " ")}</p>
          <Link href="/api/auth/signout" className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-line transition hover:bg-amber-50">
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Sign out
          </Link>
        </div>
      </aside>
      <header className="sticky top-0 z-10 border-b border-white/70 bg-white/90 px-3 py-3 shadow-[0_8px_28px_rgba(23,32,51,0.05)] backdrop-blur-xl sm:px-4 lg:hidden">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href="/" className="block">
              <BrandLogo imageClassName="h-9 w-auto max-w-[9.5rem]" priority />
            </Link>
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted">{area}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Drawer>
              <DrawerTrigger asChild>
                <Button type="button" variant="secondary" className="h-10 w-10 px-0 max-[420px]:w-10" aria-label="Open account panel">
                  <Users className="h-4 w-4" aria-hidden />
                </Button>
              </DrawerTrigger>
              <DrawerContent title="Account">
                <div className="space-y-4">
                  <NotificationCenter notifications={notifications} unreadCount={unreadCount} />
                  <div className="rounded-2xl border border-line bg-gradient-to-br from-brandSoft to-white p-4 shadow-[0_10px_28px_rgba(23,32,51,0.05)]">
                    <p className="font-semibold text-ink">{session.user.firstName} {session.user.lastName}</p>
                    <p className="text-sm text-muted">{session.user.role.replace("_", " ")}</p>
                  </div>
                  <Link href="/api/auth/signout" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(180,83,9,0.16)]">
                    <LogOut className="h-4 w-4" aria-hidden />
                    Sign out
                  </Link>
                </div>
              </DrawerContent>
            </Drawer>
            <Sheet>
              <SheetTrigger asChild>
                <Button type="button" variant="secondary" className="h-10 w-10 px-0 max-[420px]:w-10" aria-label="Open navigation">
                  <Menu className="h-4 w-4" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" title="Navigation">
                <nav className="mt-2 space-y-1">
                  {nav.map((item) => {
                    const Icon = iconMap[item.icon];
                    return (
                      <SheetClose asChild key={item.href}>
                        <Link href={item.href} className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-brandSoft hover:text-brand">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-muted group-hover:bg-white group-hover:text-brand">
                            <Icon className="h-4 w-4" aria-hidden />
                          </span>
                          {item.label}
                        </Link>
                      </SheetClose>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main className="min-w-0 px-3 py-5 sm:px-4 sm:py-6 lg:ml-72 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-[1600px] min-w-0">{children}</div>
      </main>
    </div>
  );
}


