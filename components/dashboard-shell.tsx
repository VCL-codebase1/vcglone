import { BookOpen, CalendarCheck, ClipboardList, FileText, LayoutDashboard, ListChecks, LogOut, Menu, MessageSquare, Settings, Users } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { BirthdayCelebrationModal } from "@/components/birthday-celebration-modal";
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

  return (
    <div className="min-h-screen min-w-0 bg-transparent">
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
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-white/80 bg-[#dff2ff] px-4 py-5 lg:flex">
        <div className="shrink-0">
          <Link href="/" className="block rounded-2xl bg-white/65 px-3 py-3 transition hover:bg-white">
            <BrandLogo imageClassName="max-h-16 w-auto max-w-[13rem]" priority />
            <p className="mt-1 text-xs font-medium text-muted">{area}</p>
          </Link>
        </div>
        <nav className="mt-8 min-h-0 flex-1 space-y-1 overflow-y-auto pb-4 pr-1">
          {nav.map((item) => {
            const Icon = iconMap[item.icon];
            return (
              <Link key={item.href} href={item.href} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#334568] transition hover:bg-white hover:text-brand">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 text-[#607597] transition group-hover:bg-brandSoft group-hover:text-brand">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 shrink-0 rounded-2xl border border-white/80 bg-white/75 p-4 text-sm shadow-[0_8px_24px_rgba(31,45,89,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{session.user.firstName} {session.user.lastName}</p>
              <p className="text-xs text-muted">{session.user.role.replace("_", " ")}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <LiveChatNotification href={chatUrl} initialStatus={initialChatStatus} announce className="focus-ring relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand ring-1 ring-line transition hover:bg-brandSoft" />
              <LiveNotificationBell href={notificationUrl} initialStatus={initialNotificationStatus} announce className="focus-ring relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand ring-1 ring-line transition hover:bg-brandSoft" />
            </div>
          </div>
          <Link href="/api/auth/signout" className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-line transition hover:bg-amber-50">
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Sign out
          </Link>
        </div>
      </aside>
      <header className="sticky top-0 z-10 border-b border-white/80 bg-[#dff2ff] px-3 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] shadow-[0_8px_24px_rgba(31,45,89,0.05)] sm:px-4 lg:hidden">
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
                  <div className="rounded-xl border border-line bg-surface p-4">
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
      <main className="min-w-0 px-3 py-5 sm:px-5 sm:py-6 lg:ml-72 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-[1600px] min-w-0">{children}</div>
      </main>
    </div>
  );
}


