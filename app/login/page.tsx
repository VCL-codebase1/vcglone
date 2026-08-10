import { getServerSession } from "next-auth";
import Image from "next/image";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { authOptions } from "@/lib/auth";
import { roleHome } from "@/lib/routes";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role) redirect(roleHome(session.user.role));

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#dfe3ef] p-4 sm:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] bg-[#ffffff] shadow-[0_28px_70px_rgba(31,45,89,0.18)] lg:min-h-[650px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-[#dff2ff] p-10 lg:flex lg:flex-col">
          <div className="relative z-10 max-w-sm">
            <h1 className="text-4xl font-bold tracking-tight text-[#11194f]">Welcome</h1>
            <p className="mt-2 text-sm text-[#516480]">Sign in with your VCGL work account.</p>
          </div>
          <div className="relative z-10 mt-auto h-[430px] w-full">
            <Image
              src="/images/vcgl-login-interface.png"
              alt="VCGL workplace illustration"
              fill
              priority
              sizes="(min-width: 1024px) 52vw, 0px"
              className="object-contain object-bottom"
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-36 bg-[#72b9e3]" aria-hidden />
        </section>

        <section className="flex min-h-[calc(100vh-2rem)] flex-col bg-[#ffffff] lg:min-h-0">
          <div className="relative h-48 overflow-hidden bg-[#dff2ff] lg:hidden">
            <Image src="/images/vcgl-login-interface.png" alt="VCGL workplace illustration" fill priority sizes="100vw" className="object-contain object-bottom" />
          </div>
          <div className="relative z-10 -mt-5 flex flex-1 items-center justify-center rounded-t-[1.75rem] bg-[#ffffff] px-6 py-10 sm:px-10 lg:mt-0 lg:rounded-none lg:px-14">
            <div className="w-full max-w-sm">
              <div className="text-center">
                <BrandLogo className="mx-auto w-40 sm:w-44" imageClassName="mx-auto" priority />
                <h2 className="mt-8 text-2xl font-semibold text-[#11194f]">Sign in</h2>
                <p className="mt-2 text-sm text-[#75809a]">Enter your work email and password.</p>
              </div>

              <div className="mt-8"><LoginForm /></div>

              <div className="mt-8 text-center">
                <p className="text-xs text-[#75809a]">Contact HR if you cannot access your account.</p>
                <p className="mt-3 text-[11px] text-[#9ba4b8]">&copy; {new Date().getFullYear()} Vethan Concepts Group Limited</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}




