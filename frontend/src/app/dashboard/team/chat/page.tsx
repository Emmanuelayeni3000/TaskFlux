"use client";

import { useRouter } from "next/navigation";

import { ChatPanel } from "@/components/chat/chat-panel";
import { DashboardChrome } from "../../_components/dashboard-chrome";
import { useAuthStore } from "@/store/authStore";

export default function TeamChatPage() {
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <DashboardChrome activeHref="/dashboard/team/chat" onLogout={handleLogout}>
      <div className="p-6 md:p-10">
        <ChatPanel />
      </div>
    </DashboardChrome>
  );
}
