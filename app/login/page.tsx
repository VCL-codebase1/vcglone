import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { authOptions } from "@/lib/auth";
import { roleHome } from "@/lib/routes";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role) redirect(roleHome(session.user.role));

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">WorkforceOps</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Sign in to your workspace</h1>
          <p className="mt-2 text-sm text-muted">Attendance, leave governance, employee records, and approvals in one secure place.</p>
        </div>
        <Card>
          <LoginForm />
          <div className="mt-5 rounded-md bg-surface p-3 text-xs text-muted">
            Demo accounts use password <span className="font-semibold text-ink">Password123!</span>. See README for role-specific emails.
          </div>
        </Card>
      </div>
    </main>
  );
}
