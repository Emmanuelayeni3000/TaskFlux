"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useCurrentWorkspace } from "@/store/workspaceStore";
import { DashboardChrome } from "./_components/dashboard-chrome";
import { TeamDashboard } from "@/components/dashboard/team-dashboard";
import { PersonalDashboard } from "@/components/dashboard/personal-dashboard";

export default function DashboardPage() {
  const logout = useAuthStore((state) => state.logout);
  const currentWorkspace = useCurrentWorkspace();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Render team dashboard for team workspaces
  if (currentWorkspace?.type === "team") {
    return (
      <DashboardChrome activeHref="/dashboard" onLogout={handleLogout}>
        <TeamDashboard />
      </DashboardChrome>
    );
  }

  // Render personal dashboard for personal workspaces
  return (
    <DashboardChrome activeHref="/dashboard" onLogout={handleLogout}>
      <PersonalDashboard />
    </DashboardChrome>
  );
}