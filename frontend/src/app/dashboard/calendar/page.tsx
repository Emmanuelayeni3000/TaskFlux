"use client";

import { DashboardChrome } from "../_components/dashboard-chrome";
import { CalendarView } from "@/components/calendar/calendar-view";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

export default function CalendarPage() {
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <DashboardChrome activeHref="/dashboard/calendar" onLogout={handleLogout}>
      <CalendarView />
    </DashboardChrome>
  );
}