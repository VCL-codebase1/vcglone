"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Eye, LockKeyhole, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "@/lib/toast";
import type { z } from "zod";
import { Button, Input } from "@/components/ui";
import { loginSchema } from "@/lib/validators";

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
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
      router.push(response?.url || "/");
      router.refresh();
    });
  }

  return (
    <motion.form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-danger" role="alert">{error}</div> : null}
      <label className="block space-y-1.5 text-sm font-medium text-ink">
        <span>Work email</span>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted" aria-hidden />
          <Input className="h-11 rounded-lg border-slate-200 bg-slate-50 pl-10 transition focus:bg-white sm:h-12" type="email" autoComplete="email" placeholder="you@vcgl.com" aria-invalid={Boolean(errors.email)} {...register("email")} />
        </div>
        {errors.email ? <span className="block text-xs font-normal text-danger">{errors.email.message}</span> : null}
      </label>
      <label className="block space-y-1.5 text-sm font-medium text-ink">
        <span>Password</span>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted" aria-hidden />
          <Input className="h-11 rounded-lg border-slate-200 bg-slate-50 px-10 transition focus:bg-white sm:h-12" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" aria-invalid={Boolean(errors.password)} {...register("password")} />
          <button
            type="button"
            aria-label="Toggle password visibility"
            className="focus-ring absolute right-2.5 top-2.5 rounded-md p-1.5 text-muted hover:bg-white hover:text-ink"
            onClick={() => setShowPassword((value) => !value)}
          >
            <Eye className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {errors.password ? <span className="block text-xs font-normal text-danger">{errors.password.message}</span> : null}
      </label>
      <Button type="submit" className="h-11 w-full rounded-lg text-base shadow-[0_10px_24px_rgba(16,43,116,0.2)] sm:h-12" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </motion.form>
  );
}


