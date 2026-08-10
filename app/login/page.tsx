import { getServerSession } from "next-auth";
import Image from "next/image";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card } from "@/components/ui";
import { authOptions } from "@/lib/auth";
import { roleHome } from "@/lib/routes";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role) redirect(roleHome(session.user.role));

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-3 sm:p-6 lg:p-8">
      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-2xl border border-line bg-white shadow-sm dark:bg-panel lg:min-h-[min(720px,calc(100vh-4rem))] lg:grid-cols-[1fr_0.85fr]">
        <div className="absolute right-4 top-4 z-30">
          <ThemeToggle />
        </div>
        <section className="relative hidden min-h-0 overflow-hidden border-r border-line bg-surface lg:block">
          <div className="relative h-full min-h-[620px] overflow-hidden p-8 xl:p-10">
            <Image
              src="/images/vcgl-login-interface.png"
              alt="A workplace illustration with people building operational gears and reviewing progress"
              width={1680}
              height={945}
              priority
              sizes="(min-width: 1024px) 58vw, 0px"
              className="absolute inset-8 m-auto h-[calc(100%-4rem)] w-[calc(100%-4rem)] object-contain"
            />
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center bg-white p-3 dark:bg-panel sm:min-h-0 sm:p-8 lg:p-10 xl:p-14">
          <div className="absolute inset-x-4 top-4 h-40 overflow-hidden rounded-2xl border border-white/50 bg-white lg:hidden">
            <Image
              src="/images/vcgl-login-interface.png"
              alt="A workplace illustration with people building operational gears and reviewing progress"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
          </div>
          <Card className="relative z-10 mt-40 w-full max-w-md border-0 bg-white p-6 shadow-none dark:bg-panel sm:p-8 lg:mt-0 xl:p-10">
            <div className="text-center">
              <BrandLogo className="mx-auto w-40 sm:w-48" imageClassName="mx-auto" priority />
              <h1 className="mt-6 text-2xl font-semibold text-ink sm:text-3xl">Sign in</h1>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted">Enter your work email and password.</p>
            </div>

            <div className="mt-7">
              <LoginForm />
            </div>

            <div className="mt-7 border-t border-line pt-5 text-center">
              <p className="text-xs leading-5 text-muted">Contact HR if you cannot access your account.</p>
              <p className="mt-2 text-[11px] text-slate-400">&copy; {new Date().getFullYear()} Vethan Concepts Group Limited</p>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}




