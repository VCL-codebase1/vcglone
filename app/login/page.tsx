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
    <main className="flex min-h-screen items-center justify-center bg-[#f3f7fc] p-3 dark:bg-surface sm:p-6 lg:p-8">
      <div className="relative grid w-full max-w-7xl overflow-hidden rounded-2xl border border-white bg-white shadow-[0_28px_90px_rgba(15,35,76,0.16)] dark:border-line dark:bg-panel dark:shadow-[0_28px_90px_rgba(0,0,0,0.24)] lg:min-h-[min(820px,calc(100vh-4rem))] lg:grid-cols-[1.12fr_0.88fr] lg:rounded-[2rem]">
        <div className="absolute right-4 top-4 z-30">
          <ThemeToggle />
        </div>
        <section className="relative hidden min-h-0 overflow-hidden bg-white dark:bg-panel lg:flex lg:flex-col">
          <div className="absolute left-8 top-8 z-20 xl:left-10 xl:top-10">
            <span className="inline-flex rounded-full border border-[#d8e6fb] bg-white/90 px-4 py-2 text-xs font-semibold uppercase text-[#102b74] shadow-[0_12px_30px_rgba(16,43,116,0.1)] backdrop-blur">
              VCGL People &amp; Operations
            </span>
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_18%_12%,rgba(70,137,236,0.14),transparent_28rem),radial-gradient(circle_at_86%_80%,rgba(249,190,38,0.18),transparent_24rem),linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-8 dark:bg-[radial-gradient(circle_at_18%_12%,rgba(70,137,236,0.2),transparent_28rem),radial-gradient(circle_at_86%_80%,rgba(249,190,38,0.12),transparent_24rem),linear-gradient(180deg,#121c30_0%,#0c1322_100%)] xl:p-10">
            <Image
              src="/images/vcgl-login-interface.png"
              alt="A workplace illustration with people building operational gears and reviewing progress"
              width={1680}
              height={945}
              priority
              sizes="(min-width: 1024px) 58vw, 0px"
              className="absolute inset-x-4 bottom-6 top-14 m-auto h-[82%] w-[calc(100%-2rem)] object-contain xl:top-16"
            />
          </div>
          <div className="relative z-10 border-t border-[#d8e6fb] bg-[#102b74] p-9 text-white dark:border-line dark:bg-[#0e1a33] xl:p-11">
            <p className="text-sm font-semibold uppercase text-cyan-100">Vethan Concepts Group Limited</p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight xl:text-5xl">People power every VCGL possibility.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100">
              One secure place for our teams to manage attendance, leave, employee information, and the everyday work that keeps VCGL moving forward.
            </p>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#102b74] p-3 sm:min-h-0 sm:p-8 lg:bg-[linear-gradient(150deg,#102b74_0%,#173466_44%,#f7fbff_44%,#ffffff_100%)] lg:p-10 dark:lg:bg-[linear-gradient(150deg,#0e1a33_0%,#102b74_44%,#0c1322_44%,#121c30_100%)] xl:p-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(255,194,41,0.26),transparent_17rem),radial-gradient(circle_at_8%_88%,rgba(83,145,235,0.22),transparent_18rem)]" />
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
          <Card className="relative z-10 mt-40 w-full max-w-md rounded-2xl border-0 bg-white p-6 shadow-[0_24px_65px_rgba(3,17,43,0.24)] dark:bg-panel sm:p-8 lg:mt-0 xl:p-10">
            <div className="text-center">
              <BrandLogo className="mx-auto w-40 sm:w-48" imageClassName="mx-auto" priority />
              <span className="mt-5 inline-flex rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase text-cyan-700">VCGL Workforce Portal</span>
              <h2 className="mt-4 text-2xl font-semibold text-ink sm:text-3xl">Welcome back</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">Sign in to continue to Vethan Concepts Group Limited&apos;s secure people and operations platform.</p>
            </div>

            <div className="mt-7">
              <LoginForm />
            </div>

            <div className="mt-7 border-t border-line pt-5 text-center">
              <p className="text-xs leading-5 text-muted">Need help signing in? Contact HR or your administrator.</p>
              <p className="mt-2 text-[11px] text-slate-400">&copy; {new Date().getFullYear()} Vethan Concepts Group Limited</p>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}




