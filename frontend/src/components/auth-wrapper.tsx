"use client";

import { useAuthStore } from "@/store/authStore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

const protectedRoutes = ["/dashboard", "/dashboard/tasks", "/dashboard/projects", "/dashboard/calendar", "/dashboard/settings"];

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, token } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const hasSession = useMemo(() => Boolean(token) || isAuthenticated, [token, isAuthenticated]);
  const isProtectedRoute = protectedRoutes.includes(pathname);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!hasSession && isProtectedRoute) {
      router.replace("/login");
    }
  }, [hasSession, isLoading, isProtectedRoute, router]);

  // Only show loading state if we're actually loading and don't have a session
  // Only block protected routes so the login/register pages can keep their own UI
  if (isProtectedRoute && isLoading && !hasSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-taskflux-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-taskflux-sky-blue/20 border-t-taskflux-sky-blue" />
          <p className="text-sm text-taskflux-cool-gray">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
