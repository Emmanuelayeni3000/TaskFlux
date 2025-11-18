"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  MoreHorizontal,
  Crown,
  User,
  Trash2,
  Edit,
  Loader2,
  MessageCircleWarning,
} from "lucide-react";

// Define types for team members
interface TeamMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  status: "ACTIVE" | "PENDING" | "SUSPENDED";
  joinedAt: string;
  avatar?: string | null;
  lastActive?: string | null;
}

interface WorkspaceMemberResponse {
  id: string;
  membershipId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  role: string;
  status?: string;
  joinedAt: string;
  lastActiveAt?: string | null;
  invitedBy?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  } | null;
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentWorkspace } from "@/store/workspaceStore";
import { useAuthStore } from "@/store/authStore";
import { workspaceFetch } from "@/lib/workspace-request";
import { InviteMemberModal } from "@/components/modals/invite-member-modal";

const fadeInProps = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

function getRoleIcon(role: string) {
  switch (role) {
    case "OWNER":
    case "ADMIN":
      return <Crown className="h-4 w-4" />;
    case "MEMBER":
      return <User className="h-4 w-4" />;
    case "VIEWER":
      return <Shield className="h-4 w-4" />;
    default:
      return <User className="h-4 w-4" />;
  }
}

function getRoleBadgeColor(role: string) {
  switch (role) {
    case "OWNER":
    case "ADMIN":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "MEMBER":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "VIEWER":
      return "bg-gray-100 text-gray-700 border-gray-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function getStatusBadgeColor(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-700 border-green-200";
    case "PENDING":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "SUSPENDED":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function formatLastActive(lastActive: string | null) {
  if (!lastActive) return "Never";
  
  const now = new Date();
  const active = new Date(lastActive);
  const diffMs = now.getTime() - active.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 5) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return active.toLocaleDateString();
}

interface TeamMemberCardProps {
  member: TeamMember;
  currentUser: User | null;
  currentWorkspaceRole: TeamMember["role"];
  onEditMember: (member: TeamMember) => void;
  onRemoveMember: (member: TeamMember) => void;
  onResendInvite: (member: TeamMember) => void;
}

function TeamMemberCard({ 
  member, 
  currentUser, 
  currentWorkspaceRole,
  onEditMember, 
  onRemoveMember, 
  onResendInvite 
}: TeamMemberCardProps) {
  const isCurrentUser = currentUser?.id === member.id;
  const roleCanManage = currentWorkspaceRole === "OWNER" || currentWorkspaceRole === "ADMIN";
  const canManageMembers = roleCanManage && !isCurrentUser && member.role !== "OWNER";
  const displayName = [member.firstName, member.lastName].filter(Boolean).join(" ") || member.username || member.email;
  const initials = (() => {
    const first = member.firstName?.trim().charAt(0);
    const last = member.lastName?.trim().charAt(0);
    if (first || last) {
      return `${first ?? ""}${last ?? ""}`.toUpperCase();
    }
    if (member.username) {
      return member.username.trim().slice(0, 2).toUpperCase();
    }
    return member.email.slice(0, 2).toUpperCase();
  })();

  return (
    <Card className="border-taskflux-light-gray/70 bg-white/90 hover:shadow-md transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={member.avatar || undefined} alt={displayName} />
              <AvatarFallback className="bg-taskflux-sky-blue/10 text-taskflux-sky-blue font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-taskflux-slate-navy">
                    {displayName}
                    {isCurrentUser && (
                      <span className="ml-2 text-sm font-normal text-taskflux-cool-gray">(You)</span>
                    )}
                  </h3>
                </div>
                <p className="text-sm text-taskflux-cool-gray">{member.email}</p>
              </div>

              <div className="flex items-center gap-3">
                <Badge className={`${getRoleBadgeColor(member.role)} border`}>
                  <div className="flex items-center gap-1">
                    {getRoleIcon(member.role)}
                    <span className="text-xs font-medium">{member.role}</span>
                  </div>
                </Badge>

                <Badge className={`${getStatusBadgeColor(member.status)} border`}>
                  <span className="text-xs font-medium">{member.status}</span>
                </Badge>
              </div>

              <div className="text-xs text-taskflux-cool-gray space-y-1">
                <div>Joined {new Date(member.joinedAt).toLocaleDateString()}</div>
                <div>Last active {formatLastActive(member.lastActive ?? null)}</div>
              </div>
            </div>
          </div>

          {canManageMembers && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white">
                <DropdownMenuItem onClick={() => onEditMember(member)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Role
                </DropdownMenuItem>
                {member.status === "PENDING" && (
                  <DropdownMenuItem onClick={() => onResendInvite(member)}>
                    <Mail className="mr-2 h-4 w-4" />
                    Resend Invite
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600"
                  onClick={() => onRemoveMember(member)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Member
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function TeamMembersView() {
  const currentWorkspace = useCurrentWorkspace();
  const currentUser = useAuthStore((state) => state.user);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);

  const workspaceRole: TeamMember["role"] = currentWorkspace?.role
    ? (currentWorkspace.role.toUpperCase() as TeamMember["role"])
    : "VIEWER";
  const canInviteMembers = workspaceRole === "OWNER" || workspaceRole === "ADMIN";

  useEffect(() => {
    if (!currentWorkspace || currentWorkspace.type !== "team") {
      setMembers([]);
      setMembersError(null);
      setIsLoadingMembers(false);
      return;
    }

    let isActive = true;
    const controller = new AbortController();

    const loadMembers = async () => {
      setIsLoadingMembers(true);
      setMembersError(null);

      try {
        const response = await workspaceFetch(
          `/workspaces/${currentWorkspace.id}/members`,
          undefined,
          {
            includeQueryParam: false,
            workspaceId: currentWorkspace.id,
            signal: controller.signal,
          }
        );

        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (!response.ok) {
          const message =
            payload && typeof (payload as { message?: unknown }).message === "string"
              ? (payload as { message: string }).message
              : "Failed to load team members";
          throw new Error(message);
        }

        if (!isActive) {
          return;
        }

        const membersPayload = (payload as { members?: WorkspaceMemberResponse[] })?.members ?? [];

        const resolvedMembers = membersPayload.map((member) => {
          const upperRole = String(member.role ?? "member").toUpperCase();
          const normalizedRole: TeamMember["role"] =
            upperRole === "OWNER" || upperRole === "ADMIN" || upperRole === "VIEWER"
              ? (upperRole as TeamMember["role"])
              : "MEMBER";

          const statusValue = String(member.status ?? "ACTIVE").toUpperCase();
          const normalizedStatus: TeamMember["status"] =
            statusValue === "PENDING" || statusValue === "SUSPENDED"
              ? (statusValue as TeamMember["status"])
              : "ACTIVE";

          return {
            id: member.id,
            email: member.email,
            firstName: member.firstName ?? null,
            lastName: member.lastName ?? null,
            username: member.username ?? null,
            role: normalizedRole,
            status: normalizedStatus,
            joinedAt: member.joinedAt,
            avatar: null,
            lastActive: member.lastActiveAt ?? null,
          } satisfies TeamMember;
        });

        setMembers(resolvedMembers);
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("[TeamMembersView] Failed to fetch team members", error);
        setMembers([]);
        setMembersError(error instanceof Error ? error.message : "Failed to load team members");
      } finally {
        if (isActive) {
          setIsLoadingMembers(false);
        }
      }
    };

    void loadMembers();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [currentWorkspace, reloadKey]);

  // Filter and sort members
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      // Admins/owners first, then by join date
      const aIsAdmin = a.role === "ADMIN" || a.role === "OWNER";
      const bIsAdmin = b.role === "ADMIN" || b.role === "OWNER";
      if (aIsAdmin && !bIsAdmin) return -1;
      if (bIsAdmin && !aIsAdmin) return 1;
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });
  }, [members]);

  const memberStats = useMemo(() => {
    const total = members.length;
    const active = members.filter(m => m.status === "ACTIVE").length;
    const pending = members.filter(m => m.status === "PENDING").length;
    const admins = members.filter(m => m.role === "ADMIN" || m.role === "OWNER").length;

    return { total, active, pending, admins };
  }, [members]);

  const handleInviteMember = () => {
    if (!canInviteMembers) {
      return;
    }

    setInviteModalOpen(true);
  };

  const handleEditMember = (member: TeamMember) => {
    // TODO: Open edit member modal
    console.log("Edit member", member);
  };

  const handleRemoveMember = (member: TeamMember) => {
    // TODO: Show confirmation dialog and remove member
    console.log("Remove member", member);
  };

  const handleResendInvite = (member: TeamMember) => {
    // TODO: Resend invitation email
    console.log("Resend invite", member);
  };

  const handleRefreshMembers = () => {
    setReloadKey((key) => key + 1);
  };

  if (!currentWorkspace || currentWorkspace.type === "personal") {
    return (
      <div className="p-8 text-center">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Team features not available</h2>
        <p className="text-gray-600">Team member management is only available in team workspaces.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <motion.div {...fadeInProps} className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-taskflux-slate-navy">Team Members</h1>
          <p className="text-taskflux-cool-gray">
            Manage your team members and their permissions in {currentWorkspace.name}
          </p>
        </div>
        {canInviteMembers ? (
          <Button
            onClick={handleInviteMember}
            className="bg-taskflux-sky-blue hover:bg-taskflux-blue-hover"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        ) : null}
      </motion.div>

      {/* Stats Cards */}
      <motion.div {...fadeInProps} className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-taskflux-light-gray/70 bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-taskflux-cool-gray">
              Total Members
            </CardTitle>
            <Users className="h-4 w-4 text-taskflux-sky-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-taskflux-slate-navy">{memberStats.total}</div>
          </CardContent>
        </Card>

        <Card className="border-taskflux-light-gray/70 bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-taskflux-cool-gray">
              Active
            </CardTitle>
            <User className="h-4 w-4 text-taskflux-emerald" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-taskflux-slate-navy">{memberStats.active}</div>
          </CardContent>
        </Card>

        <Card className="border-taskflux-light-gray/70 bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-taskflux-cool-gray">
              Pending
            </CardTitle>
            <Mail className="h-4 w-4 text-taskflux-amber" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-taskflux-slate-navy">{memberStats.pending}</div>
          </CardContent>
        </Card>

        <Card className="border-taskflux-light-gray/70 bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-taskflux-cool-gray">
              Admins
            </CardTitle>
            <Crown className="h-4 w-4 text-taskflux-purple" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-taskflux-slate-navy">{memberStats.admins}</div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Members List */}
      <motion.div {...fadeInProps} className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-taskflux-slate-navy">Members</h2>
        </div>

        {membersError ? (
          <Card className="border-taskflux-red/40 bg-taskflux-red/5">
            <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
              <MessageCircleWarning className="h-10 w-10 text-taskflux-red" />
              <div>
                <h3 className="text-base font-semibold text-taskflux-red">Unable to load members</h3>
                <p className="text-sm text-taskflux-red/80">{membersError}</p>
              </div>
              <Button
                variant="outline"
                onClick={handleRefreshMembers}
                className="border-taskflux-red/50 text-taskflux-red hover:bg-taskflux-red/10"
                disabled={isLoadingMembers}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {isLoadingMembers ? (
          <div className="flex items-center justify-center rounded-2xl border border-taskflux-light-gray/70 bg-white/90 py-12">
            <Loader2 className="h-5 w-5 animate-spin text-taskflux-sky-blue" />
            <span className="ml-3 text-sm font-medium text-taskflux-cool-gray">Loading team members…</span>
          </div>
        ) : sortedMembers.length > 0 ? (
          <div className="grid gap-4">
            {sortedMembers.map((member) => (
              <TeamMemberCard
                key={member.id}
                member={member}
                currentUser={currentUser}
                currentWorkspaceRole={workspaceRole}
                onEditMember={handleEditMember}
                onRemoveMember={handleRemoveMember}
                onResendInvite={handleResendInvite}
              />
            ))}
          </div>
        ) : (
          <Card className="border-taskflux-light-gray/70 bg-white/90">
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No team members yet</h3>
              <p className="text-gray-600 mb-6">
                Get started by inviting your first team member to collaborate.
              </p>
              {canInviteMembers ? (
                <Button
                  onClick={handleInviteMember}
                  className="bg-taskflux-sky-blue hover:bg-taskflux-blue-hover"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Your First Member
                </Button>
              ) : (
                <p className="text-sm text-taskflux-cool-gray">
                  Only workspace owners or admins can send invitations.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </motion.div>

      <InviteMemberModal
        open={isInviteModalOpen}
        onOpenChange={setInviteModalOpen}
        onInvited={() => {
          setInviteModalOpen(false);
          handleRefreshMembers();
        }}
      />
    </div>
  );
}