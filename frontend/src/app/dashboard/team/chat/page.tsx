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
      <div className="flex h-full flex-1 flex-col px-3 pb-6 pt-4 md:px-6">
        <div className="flex h-full w-full flex-1 min-h-0">
          <ChatPanel />
        </div>
      </div>
    </DashboardChrome>
  );
}
