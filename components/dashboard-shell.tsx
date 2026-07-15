import { CalendarCheck, ClipboardList, FileText, LayoutDashboard, LogOut, Menu, MessageSquare, Settings, Users } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LiveNotificationBell, type NotificationStatus } from "@/components/live-notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, Drawer, DrawerContent, DrawerTrigger, Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui";
import { authOptions } from "@/lib/auth";
import { ensureBirthdayNotificationsForUser, getNotificationStatus } from "@/lib/notifications";
import { roleNotifications } from "@/lib/routes";

const iconMap = {
  dashboard: LayoutDashboard,
  attendance: CalendarCheck,
  leave: ClipboardList,
  users: Users,
  reports: FileText,
  settings: Settings,
  chat: MessageSquare
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
  await ensureBirthdayNotificationsForUser({
    id: session.user.id,
    role: session.user.role,
    firstName: session.user.firstName
  });
  const status = await getNotificationStatus(session.user.id);
  const initialNotificationStatus: NotificationStatus = {
    unreadCount: status.unreadCount,
    latest: status.latest ? { ...status.latest, createdAt: status.latest.createdAt.toISOString() } : null
  };
  const notificationUrl = roleNotifications(session.user.role);

  return (
    <div className="min-h-screen min-w-0 bg-transparent">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-white/70 bg-white/85 px-4 py-5 shadow-[10px_0_40px_rgba(23,32,51,0.04)] backdrop-blur-xl dark:border-line dark:bg-panel/90 dark:shadow-none lg:flex">
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
              <Link key={item.href} href={item.href} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-brandSoft hover:text-brand dark:text-muted dark:hover:text-blue-200">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-muted transition group-hover:bg-white group-hover:text-brand dark:group-hover:bg-panel dark:group-hover:text-blue-200">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 shrink-0 rounded-2xl border border-white/70 bg-gradient-to-br from-brandSoft to-white p-4 text-sm shadow-[0_12px_32px_rgba(23,32,51,0.06)] ring-1 ring-line/70 dark:border-line dark:shadow-none">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{session.user.firstName} {session.user.lastName}</p>
              <p className="text-xs text-muted">{session.user.role.replace("_", " ")}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <LiveNotificationBell href={notificationUrl} initialStatus={initialNotificationStatus} announce className="focus-ring relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand ring-1 ring-line transition hover:bg-brandSoft dark:bg-panel dark:text-blue-200" />
            </div>
          </div>
          <Link href="/api/auth/signout" className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-line transition hover:bg-amber-50 dark:bg-panel dark:text-amber-200 dark:hover:bg-amber-950/40">
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Sign out
          </Link>
        </div>
      </aside>
      <header className="sticky top-0 z-10 border-b border-white/70 bg-white/90 px-3 py-3 shadow-[0_8px_28px_rgba(23,32,51,0.05)] backdrop-blur-xl dark:border-line dark:bg-panel/90 dark:shadow-none sm:px-4 lg:hidden">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href="/" className="block">
              <BrandLogo imageClassName="h-9 w-auto max-w-[9.5rem]" priority />
            </Link>
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted">{area}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <LiveNotificationBell href={notificationUrl} initialStatus={initialNotificationStatus} className="focus-ring relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-brand shadow-[0_8px_20px_rgba(23,32,51,0.04)]" />
            <Drawer>
              <DrawerTrigger asChild>
                <Button type="button" variant="secondary" className="h-10 w-10 px-0 max-[420px]:w-10" aria-label="Open account panel">
                  <Users className="h-4 w-4" aria-hidden />
                </Button>
              </DrawerTrigger>
              <DrawerContent title="Account">
                <div className="space-y-4">
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


