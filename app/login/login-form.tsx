"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "@/lib/toast";
import type { z } from "zod";
import { Button, Input } from "@/components/ui";
import { loginSchema } from "@/lib/validators";

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  function onSubmit(values: LoginValues) {
    setError("");
    startTransition(async () => {
      const response = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl: searchParams.get("callbackUrl") || "/"
      });

      if (response?.error) {
        setError("Invalid email/password or inactive account.");
        toast.error("Sign in failed", { description: "Check your email, password, or account status." });
        return;
      }
      toast.success("Signed in");

      // Start a fresh request after NextAuth sets the session cookie. A client-side
      // transition can reuse the unauthenticated RSC response for `/` and make the
      // post-login dashboard redirect appear to fail.
      const destination = response?.url ? new URL(response.url, window.location.origin) : new URL("/", window.location.origin);
      const sameOriginDestination = destination.origin === window.location.origin
        ? `${destination.pathname}${destination.search}${destination.hash}`
        : "/";
      window.location.assign(sameOriginDestination);
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
    >
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div> : null}
      <label className="block">
        <span className="sr-only">Work email</span>
        <Input className="h-12 rounded-full border-transparent bg-[#f0f2f8] px-5 text-[#11194f] shadow-none placeholder:text-[#98a1b5] focus:border-[#a9bce7] focus:bg-[#f0f2f8]" type="email" autoComplete="email" placeholder="Work email" aria-invalid={Boolean(errors.email)} {...register("email")} />
        {errors.email ? <span className="mt-1.5 block px-2 text-xs text-red-700">{errors.email.message}</span> : null}
      </label>
      <label className="block">
        <span className="sr-only">Password</span>
        <div className="relative">
          <Input className="h-12 rounded-full border-transparent bg-[#f0f2f8] px-5 pr-12 text-[#11194f] shadow-none placeholder:text-[#98a1b5] focus:border-[#a9bce7] focus:bg-[#f0f2f8]" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Password" aria-invalid={Boolean(errors.password)} {...register("password")} />
          <button
            type="button"
            aria-label="Toggle password visibility"
            className="absolute right-3 top-2.5 rounded-full p-1.5 text-[#75809a] transition hover:bg-[#ffffff] hover:text-[#11194f] focus:outline-none focus:ring-2 focus:ring-[#284483]"
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        </div>
        {errors.password ? <span className="mt-1.5 block px-2 text-xs text-red-700">{errors.password.message}</span> : null}
      </label>
      <Button type="submit" className="mt-2 h-12 w-full rounded-full bg-[#243a79] text-sm text-white hover:bg-[#172a63]" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}


