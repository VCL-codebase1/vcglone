"use client";

import { Eye, LockKeyhole, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const response = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
        callbackUrl: searchParams.get("callbackUrl") || "/"
      });

      if (response?.error) {
        setError("Invalid email/password or inactive account.");
        return;
      }
      router.push(response?.url || "/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div> : null}
      <label className="block space-y-1.5 text-sm font-medium text-ink">
        <span>Email</span>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" aria-hidden />
          <Input className="pl-9" name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
        </div>
      </label>
      <label className="block space-y-1.5 text-sm font-medium text-ink">
        <span>Password</span>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" aria-hidden />
          <Input className="px-9" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required minLength={8} />
          <button
            type="button"
            aria-label="Toggle password visibility"
            className="absolute right-2 top-2 rounded p-1 text-muted hover:text-ink"
            onClick={() => setShowPassword((value) => !value)}
          >
            <Eye className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </label>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}


