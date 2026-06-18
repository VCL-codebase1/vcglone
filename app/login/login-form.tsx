"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Eye, LockKeyhole, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
      className="space-y-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div> : null}
      <label className="block space-y-1.5 text-sm font-medium text-ink">
        <span>Email</span>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" aria-hidden />
          <Input className="pl-9" type="email" autoComplete="email" placeholder="you@company.com" aria-invalid={Boolean(errors.email)} {...register("email")} />
        </div>
        {errors.email ? <span className="block text-xs font-normal text-danger">{errors.email.message}</span> : null}
      </label>
      <label className="block space-y-1.5 text-sm font-medium text-ink">
        <span>Password</span>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" aria-hidden />
          <Input className="px-9" type={showPassword ? "text" : "password"} autoComplete="current-password" aria-invalid={Boolean(errors.password)} {...register("password")} />
          <button
            type="button"
            aria-label="Toggle password visibility"
            className="absolute right-2 top-2 rounded p-1 text-muted hover:text-ink"
            onClick={() => setShowPassword((value) => !value)}
          >
            <Eye className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {errors.password ? <span className="block text-xs font-normal text-danger">{errors.password.message}</span> : null}
      </label>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </motion.form>
  );
}


