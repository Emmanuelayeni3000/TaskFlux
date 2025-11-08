'use client';

import { Button } from "@/components/ui/button";
import { CardTitle, CardHeader, CardContent, Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/authStore";
import { useWorkspaceStore, normalizeWorkspace, type WorkspaceResponse } from "@/store/workspaceStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, Eye, EyeOff } from "lucide-react";
import { workspaceFetch } from "@/lib/workspace-request";

const registerSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
  confirmPassword: z.string().min(8, { message: "Confirm password is required" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { login, isAuthenticated, error, isLoading, setError, setLoading } = useAuthStore();
  const setWorkspaces = useWorkspaceStore((state) => state.setWorkspaces);
  const setWorkspaceInitialized = useWorkspaceStore((state) => state.setHasInitialized);
  const hasWorkspaceInitialized = useWorkspaceStore((state) => state.hasInitialized);
  const setWorkspaceError = useWorkspaceStore((state) => state.setError);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
  });

  const onboardingHighlights = [
    "Guided intake flows help every teammate join productive squads from day one.",
    "Reusable templates and automations remove the busywork from onboarding.",
    "Analytics dashboards uncover delivery momentum in the first 60 days.",
  ];

  useEffect(() => {
    if (isAuthenticated && hasWorkspaceInitialized) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, hasWorkspaceInitialized, router]);

  const onSubmit = async (data: RegisterFormInputs) => {
    setLoading(true);
    setError(null);
    try {
      const response = await workspaceFetch("/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
        }),
      }, { includeQueryParam: false, workspaceId: null, includeAuthorization: false });

      const result = await response.json();

      if (response.ok) {
        login(result.token, result.user);
        setWorkspaceError(null);

        const workspacePayload = Array.isArray(result?.workspaces)
          ? (result.workspaces as WorkspaceResponse[])
          : result?.workspace
            ? [result.workspace as WorkspaceResponse]
            : [];

        const normalized = workspacePayload
          .map((workspace) => normalizeWorkspace(workspace))
          .sort((a, b) => {
            if (a.type === b.type) {
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            }
            return a.type === "personal" ? -1 : 1;
          });

        setWorkspaces(normalized);
        setWorkspaceInitialized(true);
      } else {
        setError(result.message || "Registration failed");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMessage);
    } finally {
      if (!isAuthenticated) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-taskflux-background">
      <div className="absolute inset-0 bg-gradient-to-br from-taskflux-emerald/10 via-transparent to-taskflux-sky-blue/10" />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(16,185,129,0.35) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 lg:flex-row lg:items-center lg:gap-16 lg:px-12">
        <div className="order-2 flex flex-1 flex-col gap-8 rounded-3xl border border-taskflux-light-gray/60 bg-taskflux-surface/85 p-10 shadow-2xl backdrop-blur lg:order-1">
          <div className="flex items-center gap-3">
            <Image src="/taskflux-logo.png" alt="TaskFlux logo" width={100} height={80} className="rounded-2xl" />
            {/* <span className="text-2xl font-semibold text-taskflux-slate-navy">TaskFlux</span> */}
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-taskflux-slate-navy md:text-4xl">Create your workspace</h1>
            <p className="text-base text-taskflux-cool-gray md:text-lg">
              Get your team aligned in minutes with guided onboarding, automation recipes, and dashboards tuned for high-growth teams.
            </p>
          </div>
          <div className="grid gap-4">
            {onboardingHighlights.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-taskflux-light-gray/70 bg-white/70 p-4 shadow-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-taskflux-emerald/10">
                  <CheckCircle className="h-5 w-5 text-taskflux-emerald" />
                </div>
                <p className="text-sm text-taskflux-slate-navy/80">{item}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-taskflux-cool-gray/80">Looking for Enterprise onboarding? Contact hello@taskflux.app for a walkthrough.</p>
        </div>

        <Card className="order-1 flex-1 border border-taskflux-light-gray/70 bg-white/90 p-8 shadow-2xl backdrop-blur lg:order-2">
          <span className="absolute inset-x-0 top-0 h-1 rounded-t-3xl bg-gradient-to-r from-taskflux-emerald via-emerald-500 to-taskflux-sky-blue" />
          <CardHeader className="pt-6 text-center">
            <CardTitle className="text-2xl font-bold text-taskflux-slate-navy">Create account</CardTitle>
            <p className="mt-2 text-sm text-taskflux-cool-gray">We&apos;ll set up your workspace in a few steps.</p>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first-name" className="text-sm font-medium text-taskflux-slate-navy">First name</Label>
                  <Input
                    id="first-name"
                    placeholder="Alex"
                    {...register("firstName")}
                    className="border-taskflux-light-gray focus:border-taskflux-sky-blue focus:ring-2 focus:ring-taskflux-sky-blue/20 transition-all duration-200"
                  />
                  {errors.firstName && <p className="text-taskflux-red text-sm">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name" className="text-sm font-medium text-taskflux-slate-navy">Last name</Label>
                  <Input
                    id="last-name"
                    placeholder="Rivera"
                    {...register("lastName")}
                    className="border-taskflux-light-gray focus:border-taskflux-sky-blue focus:ring-2 focus:ring-taskflux-sky-blue/20 transition-all duration-200"
                  />
                  {errors.lastName && <p className="text-taskflux-red text-sm">{errors.lastName.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-taskflux-slate-navy">Work email</Label>
                <Input
                  id="email"
                  placeholder="name@company.com"
                  type="email"
                  {...register("email")}
                  className="border-taskflux-light-gray focus:border-taskflux-sky-blue focus:ring-2 focus:ring-taskflux-sky-blue/20 transition-all duration-200"
                />
                {errors.email && <p className="text-taskflux-red text-sm">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-taskflux-slate-navy">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    {...register("password")}
                    className="border-taskflux-light-gray pr-10 focus:border-taskflux-sky-blue focus:ring-2 focus:ring-taskflux-sky-blue/20 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-taskflux-cool-gray transition-colors hover:text-taskflux-slate-navy"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-taskflux-red text-sm">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-medium text-taskflux-slate-navy">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    {...register("confirmPassword")}
                    className="border-taskflux-light-gray pr-10 focus:border-taskflux-sky-blue focus:ring-2 focus:ring-taskflux-sky-blue/20 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-taskflux-cool-gray transition-colors hover:text-taskflux-slate-navy"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-taskflux-red text-sm">{errors.confirmPassword.message}</p>}
              </div>
              {error && (
                <div className="rounded-lg border border-taskflux-red/20 bg-taskflux-red/5 p-3 text-center">
                  <p className="text-taskflux-red text-sm">{error}</p>
                </div>
              )}
              <Button
                className="w-full rounded-xl bg-gradient-to-r from-taskflux-emerald via-emerald-500 to-taskflux-sky-blue px-6 py-3 font-semibold text-white shadow-lg shadow-taskflux-emerald/25 transition-all duration-200 hover:scale-[1.02] hover:shadow-taskflux-emerald/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-taskflux-sky-blue/30 disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:scale-100"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating account...
                  </div>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>
            <div className="text-center text-sm">
              <span className="text-taskflux-cool-gray">Already have an account? </span>
              <Link
                className="font-semibold text-taskflux-sky-blue transition-colors duration-200 hover:text-taskflux-blue-hover"
                href="/login"
              >
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
