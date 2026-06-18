import { CalendarCheck, ClipboardList, FileText, LayoutDashboard, LogOut, Menu, Settings, Users } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { Button, Drawer, DrawerContent, DrawerTrigger, Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui";
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
          <Link href="/" className="block rounded-md px-2 py-2">
            <BrandLogo imageClassName="max-h-16 w-auto max-w-[13rem]" priority />
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
          <div className="min-w-0">
            <Link href="/" className="block">
              <BrandLogo imageClassName="h-9 w-auto max-w-[9.5rem]" priority />
            </Link>
            <p className="truncate text-xs text-muted">{area}</p>
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
                  <div className="rounded-lg border border-line bg-surface p-4">
                    <p className="font-semibold text-ink">{session.user.firstName} {session.user.lastName}</p>
                    <p className="text-sm text-muted">{session.user.role.replace("_", " ")}</p>
                  </div>
                  <Link href="/api/auth/signout" className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white">
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
                        <Link href={item.href} className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-slate-700 hover:bg-surface">
                          <Icon className="h-4 w-4" aria-hidden />
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


