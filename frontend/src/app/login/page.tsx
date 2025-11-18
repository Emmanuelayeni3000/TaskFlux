'use client';

import { Button } from "@/components/ui/button";
import { CardTitle, CardHeader, CardContent, Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/authStore";
import { useWorkspaceStore, normalizeWorkspace, type WorkspaceResponse } from "@/store/workspaceStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle, Eye, EyeOff } from "lucide-react";
import { workspaceFetch } from "@/lib/workspace-request";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, error, isLoading, setError, setLoading } = useAuthStore();
  const setWorkspaceLoading = useWorkspaceStore((state) => state.setLoading);
  const setWorkspaceError = useWorkspaceStore((state) => state.setError);
  const setWorkspaces = useWorkspaceStore((state) => state.setWorkspaces);
  const setWorkspaceInitialized = useWorkspaceStore((state) => state.setHasInitialized);
  const hasWorkspaceInitialized = useWorkspaceStore((state) => state.hasInitialized);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const highlights = [
    "Align every project with dedicated workspaces and shared timelines.",
    "Automations nudge owners on blockers so work keeps moving forward.",
    "Enterprise-grade security with SOC2-ready audit trails across the stack.",
  ];

  useEffect(() => {
    if (isAuthenticated && hasWorkspaceInitialized) {
      // Navigate once the workspace store is ready to avoid loading flashes
      router.replace("/dashboard");
    }
  }, [isAuthenticated, hasWorkspaceInitialized, router]);

  const onSubmit = async (data: LoginFormInputs) => {
  setLoading(true);
  setError(null);
  setWorkspaceLoading(false);
    try {
      const response = await workspaceFetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
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

        if (workspacePayload.length > 0) {
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
          setWorkspaceLoading(false);
        } else {
          try {
            setWorkspaceLoading(true);
            const workspaceResponse = await workspaceFetch("/workspaces", undefined, {
              workspaceId: null,
              includeQueryParam: false,
            });

            if (workspaceResponse.ok) {
              const payload = (await workspaceResponse.json()) as {
                workspaces?: WorkspaceResponse[];
              };
              const normalized = Array.isArray(payload?.workspaces)
                ? payload.workspaces.map((workspace) => normalizeWorkspace(workspace))
                : [];
              setWorkspaces(normalized);
              setWorkspaceInitialized(true);
            } else {
              const payload = await workspaceResponse.json().catch(() => ({}));
              const message =
                payload && typeof payload === "object" && typeof payload.message === "string"
                  ? payload.message
                  : "Unable to load workspaces";
              setWorkspaceError(message);
            }
          } catch (workspaceError: unknown) {
            const message = workspaceError instanceof Error ? workspaceError.message : "Unable to load workspaces";
            setWorkspaceError(message);
          } finally {
            setWorkspaceLoading(false);
          }
        }
        // Navigation will be handled by useEffect when isAuthenticated becomes true
      } else {
        setWorkspaceLoading(false);
        
        // Handle different error types with user-friendly messages
        let errorMessage = "Login failed. Please try again.";
        
        if (response.status === 401) {
          errorMessage = result.message || "Invalid email or password. Please check your credentials and try again.";
        } else if (response.status === 429) {
          errorMessage = result.message || "Too many login attempts. Please wait a few minutes before trying again.";
        } else if (response.status === 400) {
          if (result.message?.includes('email')) {
            errorMessage = "Please enter a valid email address.";
          } else if (result.message?.includes('password')) {
            errorMessage = "Password is required.";
          } else {
            errorMessage = result.message || "Please check your input and try again.";
          }
        } else if (response.status >= 500) {
          errorMessage = "Server error. Please try again later or contact support if the problem persists.";
        } else {
          errorMessage = result.message || "Login failed. Please try again.";
        }
        
        setError(errorMessage);
      }
    } catch (error: unknown) {
      let errorMessage = "Unable to connect to the server. Please check your internet connection and try again.";
      
      if (error instanceof Error) {
        // Handle specific network/fetch errors
        if (error.message.includes('fetch')) {
          errorMessage = "Unable to connect to the server. Please check your internet connection and try again.";
        } else if (error.message.includes('timeout')) {
          errorMessage = "The request timed out. Please try again.";
        } else {
          errorMessage = "An unexpected error occurred. Please try again.";
        }
      }
      
      setWorkspaceLoading(false);
      setError(errorMessage);
    } finally {
      if (!isAuthenticated) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-taskflux-background">
      <div className="absolute inset-0 bg-gradient-to-br from-taskflux-sky-blue/10 via-transparent to-taskflux-emerald/10" />
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(59,130,246,0.35) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 lg:flex-row lg:items-center lg:gap-16 lg:px-12">
        <div className="flex flex-1 flex-col gap-8 rounded-3xl border border-taskflux-light-gray/60 bg-taskflux-surface/80 p-10 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-3">
            <Image src="/taskflux-logo.png" alt="TaskFlux logo" width={100} height={80} className="rounded-2xl" />
            {/* <span className="text-2xl font-semibold text-taskflux-slate-navy">TaskFlux</span> */}
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-taskflux-slate-navy md:text-4xl">Welcome back</h1>
            <p className="text-base text-taskflux-cool-gray md:text-lg">
              Sign in to pick up where your team left off. TaskFlux keeps your projects, automations, and insights in one calm workflow.
            </p>
          </div>
          <div className="grid gap-4">
            {highlights.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-taskflux-light-gray/70 bg-white/70 p-4 shadow-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-taskflux-sky-blue/10">
                  <CheckCircle className="h-5 w-5 text-taskflux-sky-blue" />
                </div>
                <p className="text-sm text-taskflux-slate-navy/80">{item}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-taskflux-cool-gray/80">Need advanced support? Email hello@taskflux.app for a tailored onboarding.</p>
        </div>

        <Card className="relative flex-1 border border-taskflux-light-gray/70 bg-white/85 p-8 shadow-2xl backdrop-blur">
          <span className="absolute inset-x-0 top-0 h-1 rounded-t-3xl bg-gradient-to-r from-taskflux-sky-blue via-blue-500 to-taskflux-blue-hover" />
          <CardHeader className="pt-6 text-center">
            <CardTitle className="text-2xl font-bold text-taskflux-slate-navy">Sign in</CardTitle>
            <p className="mt-2 text-sm text-taskflux-cool-gray">Enter your credentials to access your workspace.</p>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-taskflux-slate-navy">Email</Label>
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
                    placeholder="Enter your password"
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
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-taskflux-cool-gray">
                  <Checkbox id="remember-me" />
                  <Label htmlFor="remember-me" className="cursor-pointer">Remember me</Label>
                </div>
                <button type="button" className="text-taskflux-sky-blue transition-colors duration-200 hover:text-taskflux-blue-hover">
                  Forgot password?
                </button>
              </div>
              {error && (
                <div className="rounded-lg border border-taskflux-red/20 bg-taskflux-red/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-taskflux-red/10 mt-0.5">
                      <svg className="h-3 w-3 text-taskflux-red" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-taskflux-red text-sm font-medium">Sign in failed</p>
                      <p className="text-taskflux-red/80 text-sm mt-1">{error}</p>
                      {error.includes('Too many') && (
                        <p className="text-taskflux-cool-gray text-xs mt-2">
                          For security reasons, your account has been temporarily restricted. You can also try resetting your password.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <Button
                className="w-full rounded-xl bg-gradient-to-r from-taskflux-sky-blue via-blue-500 to-taskflux-blue-hover px-6 py-3 font-semibold text-white shadow-lg shadow-taskflux-sky-blue/25 transition-all duration-200 hover:scale-[1.02] hover:shadow-taskflux-sky-blue/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-taskflux-sky-blue/30 disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:scale-100"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
            <div className="text-center text-sm">
              <span className="text-taskflux-cool-gray">Don&apos;t have an account? </span>
              <Link
                className="font-semibold text-taskflux-sky-blue transition-colors duration-200 hover:text-taskflux-blue-hover"
                href="/register"
              >
                Create one now
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
