"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  ClipboardCheck,
  FolderOpen,
  Home,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Settings,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskModal } from "@/components/modals/task-modal";
import { CreateTeamModal } from "@/components/modals/create-team-modal";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useChatConnection } from "@/hooks/useWorkspaceChat";
import { useChatStore } from "@/store/chatStore";
import {
  useWorkspaceStore,
  useCurrentWorkspace,
  usePersonalWorkspace,
  useTeamWorkspaces,
  type Workspace,
} from "@/store/workspaceStore";
import { useWorkspaceCapabilities } from "@/hooks/use-workspace-capabilities";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
};

type NavItemWithBadge = NavItem & { badge?: number };

const getNavItems = (workspaceType?: string): NavItem[] => {
  const baseItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/tasks", label: "Tasks", icon: ClipboardCheck },
    { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  ];

  // Only show Projects and Team for team workspaces
  if (workspaceType === "team") {
    baseItems.splice(2, 0, { href: "/dashboard/projects", label: "Projects", icon: FolderOpen });
    baseItems.push({ href: "/dashboard/team", label: "Team", icon: User });
    baseItems.push({ href: "/dashboard/team/chat", label: "Team Chat", icon: MessageSquare });
  }

  return baseItems;
};

const secondaryNav = [{ href: "/dashboard/settings", label: "Settings", icon: Settings }];

const fadeIn = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
};

export function DashboardChrome({
  activeHref,
  onLogout,
  children,
}: {
  activeHref: string;
  onLogout: () => void;
  children: ReactNode;
}) {
  // Bootstrap moved to a layout component or page level to avoid loops
  useChatConnection();
  const isSwitching = useWorkspaceStore((state) => state.isSwitching);
  const isLoading = useWorkspaceStore((state) => state.isLoading);
  const showWorkspaceBanner = isLoading && !isSwitching;
  const workspaceBannerLabel = "Loading workspace context…";

  return (
    <div className="relative min-h-screen bg-taskflux-background">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-taskflux-sky-blue/8 via-transparent to-taskflux-emerald/10" />
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(59,130,246,0.35) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 flex h-screen flex-col">
        <AnimatePresence>
          {isSwitching ? (
            <WorkspaceSwitchOverlay key="workspace-switch-overlay" />
          ) : null}
        </AnimatePresence>
        {showWorkspaceBanner && (
          <div className="pointer-events-none absolute inset-x-0 top-16 z-50 flex justify-center">
            <div className="flex items-center gap-2 rounded-full border border-taskflux-light-gray/70 bg-white/90 px-4 py-1 text-xs font-medium text-taskflux-cool-gray shadow-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-taskflux-sky-blue" aria-hidden />
              {workspaceBannerLabel}
            </div>
          </div>
        )}
        <TopBar onLogout={onLogout} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar activeHref={activeHref} onLogout={onLogout} />
          <motion.main
            {...fadeIn}
            className="flex-1 overflow-y-auto"
          >
            {children}
          </motion.main>
        </div>
      </div>
    </div>
  );
}

function WorkspaceSwitchOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur"
    >
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-taskflux-light-gray/60 bg-white/95 px-10 py-8 shadow-2xl">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-taskflux-sky-blue/10">
          <Loader2 className="h-7 w-7 animate-spin text-taskflux-sky-blue" />
        </span>
        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold text-taskflux-slate-navy">Switching workspace…</p>
          <p className="text-xs text-taskflux-cool-gray">
            Bringing your workspace data online. This won’t take long.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function TopBar({ onLogout }: { onLogout: () => void }) {
  const currentWorkspace = useCurrentWorkspace();
  const personalWorkspace = usePersonalWorkspace();
  const teamWorkspaces = useTeamWorkspaces();
  const unreadCounts = useChatStore((state) => state.unreadCounts);
  const switchWorkspace = useWorkspaceStore((state) => state.switchWorkspace);
  const isSwitching = useWorkspaceStore((state) => state.isSwitching);
  const isLoading = useWorkspaceStore((state) => state.isLoading);
  const workspaceError = useWorkspaceStore((state) => state.error);
  const capabilities = useWorkspaceCapabilities();
  const canCreateTasks = capabilities.canCreateTasks;
  const canCreateWorkspaces = capabilities.canCreateWorkspaces;
  const [isCreating] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  const workspaceLabel = isLoading && !currentWorkspace
    ? "Loading workspaces…"
    : currentWorkspace?.name ?? "Select workspace";



  const getRoleLabel = (role: Workspace["role"]) => {
    if (role === "owner") return "Owner";
    if (role === "admin") return "Admin";
    if (role === "viewer") return "Viewer";
    return "Member";
  };

  const getInvitedLabel = (workspace: Workspace) => {
    if (!workspace.invitedBy) {
      return null;
    }

    const { firstName, lastName, username, email } = workspace.invitedBy;
    const name = [firstName ?? "", lastName ?? ""].join(" ").trim()
      || username
      || email;

    return name ? `Invited by ${name}` : null;
  };

  return (
    <header className="sticky top-0 z-40 border-b border-taskflux-light-gray/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 lg:px-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Image src="/taskflux-logo.png" alt="TaskFlux" width={100} height={80} className="rounded-lg" />
            {/* <span className="text-xl font-semibold text-taskflux-slate-navy">TaskFlux</span> */}
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full border-taskflux-light-gray/80 bg-white px-4 py-2 text-sm font-medium text-taskflux-slate-navy hover:bg-taskflux-pale-gray">
                  <span className="flex items-center gap-2">
                    {isSwitching && <span className="h-2 w-2 animate-pulse rounded-full bg-taskflux-sky-blue" aria-hidden />}
                    <span>{workspaceLabel}</span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 bg-white">
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-taskflux-cool-gray">Switch workspace</p>
                </div>
                {isLoading && (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-taskflux-cool-gray">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-taskflux-sky-blue" aria-hidden />
                    <span>Loading workspaces…</span>
                  </div>
                )}
                {workspaceError && (
                  <div className="px-3 pb-2">
                    <p className="text-xs text-taskflux-red">{workspaceError}</p>
                  </div>
                )}
                <DropdownMenuSeparator />
                {personalWorkspace && (
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      switchWorkspace(personalWorkspace.id);
                    }}
                    className={`flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-sm ${
                      currentWorkspace?.id === personalWorkspace.id
                        ? "bg-taskflux-sky-blue/10 text-taskflux-slate-navy focus:bg-taskflux-sky-blue/10"
                        : "text-taskflux-cool-gray focus:bg-taskflux-pale-gray focus:text-taskflux-slate-navy"
                    }`}
                  >
                    <span className="font-medium">{personalWorkspace.name}</span>
                    <span className="text-xs text-taskflux-cool-gray/80">Personal · {getRoleLabel(personalWorkspace.role)}</span>
                  </DropdownMenuItem>
                )}
                {teamWorkspaces.length > 0 && (
                  <div className="py-1">
                    <div className="px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-taskflux-cool-gray">Team workspaces</p>
                    </div>
                    {teamWorkspaces.map((workspace) => (
                      <DropdownMenuItem
                        key={workspace.id}
                        onSelect={(event) => {
                          event.preventDefault();
                          switchWorkspace(workspace.id);
                        }}
                        className={`flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-sm ${
                          currentWorkspace?.id === workspace.id
                            ? "bg-taskflux-sky-blue/10 text-taskflux-slate-navy focus:bg-taskflux-sky-blue/10"
                            : "text-taskflux-cool-gray focus:bg-taskflux-pale-gray focus:text-taskflux-slate-navy"
                        }`}
                      >
                        <div className="flex w-full items-center gap-2">
                          <span className="font-medium flex-1">{workspace.name}</span>
                          {unreadCounts[workspace.id] ? (
                            <Badge
                              variant="secondary"
                              className="ml-auto rounded-full border-none bg-taskflux-sky-blue/15 text-[0.7rem] font-semibold uppercase tracking-wider text-taskflux-sky-blue"
                            >
                              {unreadCounts[workspace.id]}
                            </Badge>
                          ) : null}
                        </div>
                        <span className="text-xs text-taskflux-cool-gray/80">{getRoleLabel(workspace.role)}</span>
                        {getInvitedLabel(workspace) && (
                          <span className="text-[0.65rem] text-taskflux-cool-gray/70">{getInvitedLabel(workspace)}</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    setIsTeamModalOpen(true);
                  }}
                  disabled={!canCreateWorkspaces || isCreating || isLoading}
                  className={`text-taskflux-sky-blue focus:bg-taskflux-sky-blue/10 ${
                    canCreateWorkspaces && !isCreating && !isLoading ? "" : "pointer-events-none opacity-50"
                  }`}
                >
                  Create new team
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-taskflux-cool-gray" />
              <input
                type="search"
                placeholder="Search tasks, projects..."
                className="w-64 rounded-full border border-taskflux-light-gray/80 bg-white/80 py-2 pl-10 pr-4 text-sm text-taskflux-slate-navy placeholder:text-taskflux-cool-gray focus:border-taskflux-sky-blue focus:ring-2 focus:ring-taskflux-sky-blue/20"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canCreateTasks ? (
            <TaskModal
              trigger={
                <Button
                  variant="outline"
                  className="hidden rounded-full border-taskflux-light-gray/80 text-taskflux-slate-navy hover:bg-taskflux-pale-gray md:inline-flex"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New task
                </Button>
              }
            />
          ) : (
            <Button
              variant="outline"
              disabled
              className="hidden cursor-not-allowed opacity-60 rounded-full border-taskflux-light-gray/80 text-taskflux-slate-navy hover:bg-taskflux-pale-gray md:inline-flex"
            >
              <Plus className="mr-2 h-4 w-4" />
              New task
            </Button>
          )}
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-taskflux-sky-blue text-white">
                  <User className="h-4 w-4" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings/notifications">
                  Notification Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-taskflux-red">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Create Team Modal */}
      <CreateTeamModal
        open={isTeamModalOpen}
        onOpenChange={setIsTeamModalOpen}
        onSuccess={(workspace) => {
          switchWorkspace(workspace.id);
        }}
      />
    </header>
  );
}

function Sidebar({ activeHref, onLogout }: { activeHref: string; onLogout: () => void }) {
  const currentWorkspace = useCurrentWorkspace();
  const unreadCounts = useChatStore((state) => state.unreadCounts);
  const workspaceTypeLabel = currentWorkspace?.type === "team" ? "Team workspace" : "Personal workspace";

  const navigationWithBadges: NavItemWithBadge[] = useMemo(() => {
    const items = getNavItems(currentWorkspace?.type);
    if (!currentWorkspace?.id) {
      return items;
    }

    const unread = unreadCounts[currentWorkspace.id] ?? 0;
    if (unread === 0) {
      return items;
    }

    return items.map((item) =>
      item.href === "/dashboard/team/chat"
        ? { ...item, badge: unread }
        : item
    );
  }, [currentWorkspace?.id, currentWorkspace?.type, unreadCounts]);

  return (
    <aside className="hidden h-full w-72 border-r border-taskflux-light-gray/70 bg-white/80 backdrop-blur md:block">
      <div className="flex h-full flex-col px-5 py-8">
        <nav className="flex-1 space-y-7 overflow-y-auto pr-2">
          <div className="rounded-2xl border border-taskflux-light-gray/60 bg-taskflux-pale-gray/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-taskflux-cool-gray">Current workspace</p>
            <p className="mt-2 text-base font-semibold text-taskflux-slate-navy">{currentWorkspace?.name ?? "No workspace"}</p>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-taskflux-light-gray/70 bg-white/80 px-3 py-1 text-xs font-medium text-taskflux-cool-gray">
              <span className="h-2 w-2 rounded-full bg-taskflux-sky-blue" aria-hidden />
              {workspaceTypeLabel}
            </span>
          </div>
          <div className="space-y-2">
            <p className="px-4 text-xs font-semibold uppercase tracking-[0.25em] text-taskflux-cool-gray mb-3">Overview</p>
            {navigationWithBadges.map(({ href, label, icon: Icon, badge }) => {
              const active = activeHref === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center gap-3 rounded-2xl py-3 pl-6 pr-4 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-white text-taskflux-slate-navy shadow-md shadow-taskflux-sky-blue/20 ring-1 ring-taskflux-sky-blue/40"
                      : "text-taskflux-cool-gray hover:bg-taskflux-pale-gray hover:text-taskflux-slate-navy"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`absolute left-2 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full transition-all duration-200 ${
                      active ? "scale-100 bg-taskflux-sky-blue" : "scale-0 bg-taskflux-sky-blue/40 group-hover:scale-100"
                    }`}
                  />
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{label}</span>
                  {badge ? (
                    <Badge
                      variant="secondary"
                      className="ml-auto rounded-full border-none bg-taskflux-sky-blue/15 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-taskflux-sky-blue"
                    >
                      {badge}
                    </Badge>
                  ) : null}
                </Link>
              );
            })}
          </div>
          <div className="space-y-2">
            <p className="px-4 text-xs font-semibold uppercase tracking-[0.25em] text-taskflux-cool-gray">Workspace</p>
            {secondaryNav.map(({ href, label, icon: Icon }) => {
              const active = activeHref === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center gap-3 rounded-2xl py-3 pl-6 pr-4 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-white text-taskflux-slate-navy shadow-md shadow-taskflux-sky-blue/20 ring-1 ring-taskflux-sky-blue/40"
                      : "text-taskflux-cool-gray hover:bg-taskflux-pale-gray hover:text-taskflux-slate-navy"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`absolute left-2 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full transition-all duration-200 ${
                      active ? "scale-100 bg-taskflux-sky-blue" : "scale-0 bg-taskflux-sky-blue/40 group-hover:scale-100"
                    }`}
                  />
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="flex-shrink-0 space-y-4 mt-4">
          <div className="rounded-2xl border border-taskflux-light-gray/60 bg-white/90 p-5 text-sm text-taskflux-cool-gray">
            <h3 className="text-sm font-semibold text-taskflux-slate-navy">Workspace quick tips</h3>
            <p className="mt-2 text-xs">
              Invite stakeholders to your team workspace and enable weekly health snapshots to surface risks early.
            </p>
          </div>
          <Button
            onClick={onLogout}
            variant="outline"
            className="w-full justify-center rounded-full border-taskflux-light-gray/80 text-taskflux-slate-navy transition-all duration-200 hover:bg-taskflux-pale-gray"
          >
            Log out
          </Button>
        </div>
      </div>
    </aside>
  );
}
