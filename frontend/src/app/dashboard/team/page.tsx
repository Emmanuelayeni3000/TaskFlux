"use client";

import { DashboardChrome } from "../_components/dashboard-chrome";
import { TeamMembersView } from "@/components/team/team-members-view";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

export default function TeamMembersPage() {
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <DashboardChrome activeHref="/dashboard/team" onLogout={handleLogout}>
      <TeamMembersView />
    </DashboardChrome>
  );
}