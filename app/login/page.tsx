import { getServerSession } from "next-auth";
import Image from "next/image";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { Card } from "@/components/ui";
import { authOptions } from "@/lib/auth";
import { roleHome } from "@/lib/routes";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role) redirect(roleHome(session.user.role));

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef1f6] p-3 sm:p-6 lg:p-8">
      <div className="relative grid w-full max-w-7xl overflow-hidden rounded-2xl bg-[#173466] shadow-[0_28px_80px_rgba(15,35,76,0.22)] lg:min-h-[min(800px,calc(100vh-4rem))] lg:grid-cols-[1.15fr_0.85fr] lg:rounded-[2rem]">
        <section className="relative hidden min-h-0 overflow-hidden lg:block">
          <Image
            src="/images/vcgl-login-artwork.webp"
            alt="A workplace illustration celebrating people, collaboration, and achievement"
            width={1640}
            height={1230}
            priority
            sizes="(min-width: 1024px) 58vw, 0px"
            className="absolute -left-[18%] -top-[30%] h-[160%] w-auto max-w-none"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c2857]/70 via-[#102b5b]/10 to-[#071f49]/90" />
          <div className="absolute inset-x-0 top-0 p-10 xl:p-14">
            <span className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
              VCGL People &amp; Operations
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 max-w-2xl p-10 text-white xl:p-14">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">Vethan Concepts Group Limited</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">People power every VCGL possibility.</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-blue-100/90">
              One secure place for our teams to manage attendance, leave, employee information, and the everyday work that keeps VCGL moving forward.
            </p>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center p-3 sm:min-h-0 sm:p-8 lg:p-10 xl:p-14">
          <div className="absolute inset-x-0 top-0 h-48 overflow-hidden lg:hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(64,210,221,0.24),transparent_55%)]" />
            <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full border border-white/10" />
            <div className="absolute right-10 top-14 h-20 w-20 rounded-full border border-white/10" />
          </div>

          <Card className="relative z-10 w-full max-w-md rounded-2xl border-0 bg-white p-6 shadow-[0_24px_65px_rgba(3,17,43,0.24)] sm:p-8 xl:p-10">
            <div className="text-center">
              <BrandLogo className="mx-auto w-40 sm:w-48" imageClassName="mx-auto" priority />
              <span className="mt-5 inline-flex rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">VCGL Workforce Portal</span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Welcome back</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">Sign in to continue to Vethan Concepts Group Limited&apos;s secure people and operations platform.</p>
            </div>

            <div className="mt-7">
              <LoginForm />
            </div>

            <div className="mt-7 border-t border-line pt-5 text-center">
              <p className="text-xs leading-5 text-muted">Need help signing in? Contact your VCGL system administrator.</p>
              <p className="mt-2 text-[11px] text-slate-400">&copy; {new Date().getFullYear()} Vethan Concepts Group Limited</p>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}




