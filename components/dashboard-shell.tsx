import { BookOpen, CalendarCheck, ClipboardList, FileText, LayoutDashboard, ListChecks, LogOut, Menu, MessageSquare, Settings, Users } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { BirthdayCelebrationModal } from "@/components/birthday-celebration-modal";
import { DashboardNavLink } from "@/components/dashboard-nav-link";
import { LiveChatNotification, type ChatNotificationStatus } from "@/components/live-chat-notification";
import { LiveNotificationBell, type NotificationStatus } from "@/components/live-notification-bell";
import { NewFeaturesAnnouncement } from "@/components/new-features-announcement";
import { Button, Drawer, DrawerContent, DrawerTrigger, Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui";
import { ensureCheckoutReminderForUser } from "@/lib/attendance-reminders";
import { authOptions } from "@/lib/auth";
import { getChatNotificationStatus } from "@/lib/chat";
import { todayDateOnly } from "@/lib/dates";
import { ensureBirthdayNotificationsForUser, getNotificationStatus, getTodaysBirthdayCelebrants } from "@/lib/notifications";
import { roleChat, roleNotifications } from "@/lib/routes";
import { ensureTaskRemindersForUser } from "@/lib/task-reminders";

const iconMap = {
  dashboard: LayoutDashboard,
  attendance: CalendarCheck,
  leave: ClipboardList,
  users: Users,
  reports: FileText,
  settings: Settings,
  chat: MessageSquare,
  tasks: ListChecks,
  knowledge: BookOpen
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
  const today = todayDateOnly();
  const birthdayCelebrants = await getTodaysBirthdayCelebrants();
  await Promise.all([
    ensureBirthdayNotificationsForUser({ id: session.user.id, role: session.user.role, firstName: session.user.firstName }, birthdayCelebrants),
    ensureTaskRemindersForUser({ id: session.user.id, role: session.user.role }),
    ensureCheckoutReminderForUser(session.user.id)
  ]);
  const [status, chatStatus] = await Promise.all([
    getNotificationStatus(session.user.id),
    getChatNotificationStatus(session.user.id, session.user.role)
  ]);
  const initialNotificationStatus: NotificationStatus = {
    unreadCount: status.unreadCount,
    latest: status.latest ? { ...status.latest, createdAt: status.latest.createdAt.toISOString() } : null
  };
  const initialChatStatus: ChatNotificationStatus = {
    unreadCount: chatStatus.unreadCount,
    latest: chatStatus.latest ? { ...chatStatus.latest, createdAt: chatStatus.latest.createdAt.toISOString() } : null
  };
  const notificationUrl = roleNotifications(session.user.role);
  const chatUrl = roleChat(session.user.role);
  const primaryNav = [...nav.filter((item) => item.icon === "dashboard"), ...nav.filter((item) => item.icon !== "dashboard" && ["attendance", "tasks", "knowledge", "users"].includes(item.icon))].slice(0, 5);

  return (
    <div className="mx-auto min-h-screen min-w-0 max-w-[1800px] bg-[#f1f3f7] sm:m-4 sm:min-h-[calc(100vh-2rem)] sm:rounded-[2rem] sm:border sm:border-white lg:mx-auto lg:my-6 lg:w-[calc(100%-3rem)] lg:min-h-[calc(100vh-3rem)] lg:rounded-[2.5rem]">
      <NewFeaturesAnnouncement
        userId={session.user.id}
        firstName={session.user.firstName}
        role={session.user.role}
      />
      <BirthdayCelebrationModal
        viewerId={session.user.id}
        role={session.user.role}
        dateKey={today.toISOString().slice(0, 10)}
        celebrants={birthdayCelebrants.map((person) => ({
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          department: person.department?.name || null
        }))}
      />
      <aside className="hidden flex-wrap items-center justify-between gap-x-8 gap-y-5 px-8 pb-2 pt-7 lg:flex xl:px-10" aria-label="Workspace navigation">
        <div className="shrink-0">
          <Link href="/" className="block rounded-2xl bg-white px-4 py-2">
            <BrandLogo imageClassName="h-10 w-auto max-w-[10rem]" priority />
            <p className="mt-1 text-[11px] font-medium text-muted">{area}</p>
          </Link>
        </div>
        <nav className="order-last flex w-full min-w-0 items-center gap-1 rounded-full bg-white/65 p-1.5" aria-label="Main navigation">
          {primaryNav.map((item) => {
            return <DashboardNavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />;
          })}
          <Sheet>
            <SheetTrigger asChild><Button variant="ghost" className="ml-auto shrink-0"><Menu className="h-4 w-4" />All pages</Button></SheetTrigger>
            <SheetContent side="right" title="All pages">
              <nav className="mt-3 space-y-1" aria-label="All workspace pages">
                {nav.map((item) => {
                  const Icon = iconMap[item.icon];
                  return <SheetClose asChild key={item.href}><Link href={item.href} className="focus-ring flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-brandSoft"><Icon className="h-4 w-4 text-muted" />{item.label}</Link></SheetClose>;
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </nav>
        <div className="flex shrink-0 items-center gap-5 text-sm">
          <div className="flex items-center justify-between gap-5">
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{session.user.firstName} {session.user.lastName}</p>
              <p className="text-xs text-muted">{session.user.role.replace("_", " ")}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <LiveChatNotification href={chatUrl} initialStatus={initialChatStatus} announce className="focus-ring relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-white hover:text-brand" />
              <LiveNotificationBell href={notificationUrl} initialStatus={initialNotificationStatus} announce className="focus-ring relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-white hover:text-brand" />
            </div>
          </div>
          <Link href="/api/auth/signout" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-semibold text-slate-600 transition hover:text-danger">
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Sign out
          </Link>
        </div>
      </aside>
      <header className="sticky top-0 z-10 border-b border-white bg-[#f1f3f7]/95 px-3 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur sm:rounded-t-[2rem] sm:px-5 lg:hidden">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href="/" className="block">
              <BrandLogo imageClassName="h-9 w-auto max-w-[9.5rem]" priority />
            </Link>
            <p className="truncate text-xs font-medium text-muted">{area}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 min-[421px]:gap-2">
            <LiveChatNotification href={chatUrl} initialStatus={initialChatStatus} className="focus-ring relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white text-brand" />
            <LiveNotificationBell href={notificationUrl} initialStatus={initialNotificationStatus} className="focus-ring relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white text-brand" />
            <Drawer>
              <DrawerTrigger asChild>
                <Button type="button" variant="secondary" className="h-10 w-10 px-0 max-[420px]:w-10" aria-label="Open account panel">
                  <Users className="h-4 w-4" aria-hidden />
                </Button>
              </DrawerTrigger>
              <DrawerContent title="Account">
                <div className="space-y-4">
                  <div className="border-b border-line pb-4">
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
                        <Link href={item.href} className="focus-ring flex min-h-11 items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-surface hover:text-ink">
                          <Icon className="h-[18px] w-[18px] shrink-0 text-slate-400" aria-hidden />
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
      <main id="main-content" className="min-w-0 px-3 py-6 sm:px-5 sm:py-7 lg:px-8 lg:py-8 xl:px-10">
        <div className="mx-auto w-full max-w-[1680px] min-w-0">{children}</div>
      </main>
    </div>
  );
}


