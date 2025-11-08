"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";

// Define types for team members
interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  status: "ACTIVE" | "PENDING" | "SUSPENDED";
  joinedAt: string;
  avatar?: string | null;
  lastActive?: string | null;
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

const fadeInProps = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

// Mock team members data - this would come from an API
const mockTeamMembers: TeamMember[] = [
  {
    id: "1",
    email: "john.doe@company.com",
    firstName: "John",
    lastName: "Doe",
    role: "ADMIN",
    status: "ACTIVE",
    joinedAt: "2024-01-15T10:00:00Z",
    avatar: null,
    lastActive: "2024-01-28T14:30:00Z",
  },
  {
    id: "2",
    email: "jane.smith@company.com", 
    firstName: "Jane",
    lastName: "Smith",
    role: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2024-01-20T09:15:00Z",
    avatar: null,
    lastActive: "2024-01-29T16:45:00Z",
  },
  {
    id: "3",
    email: "mike.wilson@company.com",
    firstName: "Mike",
    lastName: "Wilson", 
    role: "VIEWER",
    status: "PENDING",
    joinedAt: "2024-01-25T11:30:00Z",
    avatar: null,
    lastActive: null,
  },
];

function getRoleIcon(role: string) {
  switch (role) {
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
  onEditMember: (member: TeamMember) => void;
  onRemoveMember: (member: TeamMember) => void;
  onResendInvite: (member: TeamMember) => void;
}

function TeamMemberCard({ 
  member, 
  currentUser, 
  onEditMember, 
  onRemoveMember, 
  onResendInvite 
}: TeamMemberCardProps) {
  const isCurrentUser = currentUser?.id === member.id;
  const canManageMembers = currentUser?.role === "ADMIN" && !isCurrentUser;

  return (
    <Card className="border-taskflux-light-gray/70 bg-white/90 hover:shadow-md transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={member.avatar || undefined} alt={`${member.firstName} ${member.lastName}`} />
              <AvatarFallback className="bg-taskflux-sky-blue/10 text-taskflux-sky-blue font-semibold">
                {member.firstName?.[0]}{member.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-taskflux-slate-navy">
                    {member.firstName} {member.lastName}
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
                <div>Last active {formatLastActive(member.lastActive || null)}</div>
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
  const [members] = useState<TeamMember[]>(mockTeamMembers);

  // Filter and sort members
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      // Admins first, then by join date
      if (a.role === "ADMIN" && b.role !== "ADMIN") return -1;
      if (b.role === "ADMIN" && a.role !== "ADMIN") return 1;
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });
  }, [members]);

  const memberStats = useMemo(() => {
    const total = members.length;
    const active = members.filter(m => m.status === "ACTIVE").length;
    const pending = members.filter(m => m.status === "PENDING").length;
    const admins = members.filter(m => m.role === "ADMIN").length;

    return { total, active, pending, admins };
  }, [members]);

  const handleInviteMember = () => {
    // TODO: Open invite member modal
    console.log("Invite member");
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
        
        <Button onClick={handleInviteMember} className="bg-taskflux-sky-blue hover:bg-taskflux-blue-hover">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
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

        <div className="grid gap-4">
          {sortedMembers.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              currentUser={currentUser}
              onEditMember={handleEditMember}
              onRemoveMember={handleRemoveMember}
              onResendInvite={handleResendInvite}
            />
          ))}
        </div>

        {members.length === 0 && (
          <Card className="border-taskflux-light-gray/70 bg-white/90">
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No team members yet</h3>
              <p className="text-gray-600 mb-6">
                Get started by inviting your first team member to collaborate.
              </p>
              <Button onClick={handleInviteMember} className="bg-taskflux-sky-blue hover:bg-taskflux-blue-hover">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Your First Member
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}