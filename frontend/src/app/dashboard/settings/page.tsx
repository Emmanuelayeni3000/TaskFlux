"use client";

import { useState, type ComponentType, type Dispatch, type ReactNode, type SetStateAction, type SVGProps } from "react";

import { useRouter } from "next/navigation";
import { motion, type Transition } from "framer-motion";
import {
  Bell,
  Clock,
  Download,
  Globe,
  Key,
  Monitor,
  Palette,
  Save,
  Shield,
  Trash2,
  Upload,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardChrome } from "../_components/dashboard-chrome";
import { useAuthStore } from "@/store/authStore";
import { useCurrentWorkspace, type Workspace } from "@/store/workspaceStore";
import { useWorkspaceCapabilities } from "@/hooks/use-workspace-capabilities";
import type { WorkspaceCapabilities } from "@/lib/workspace-permissions";

type TabId = "profile" | "notifications" | "privacy" | "appearance" | "account";

const easeCurve: [number, number, number, number] = [0.16, 1, 0.3, 1];
const baseTransition: Transition = { duration: 0.45, ease: easeCurve };
const fadeInProps = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const tabs: { id: TabId; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "account", label: "Account", icon: Key },
];

export default function SettingsPage() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    desktop: true,
    weekly: true,
  });
  const [privacy, setPrivacy] = useState({
    profilePublic: false,
    showOnlineStatus: true,
    allowDirectMessages: true,
  });
  const currentWorkspace = useCurrentWorkspace();
  const capabilities = useWorkspaceCapabilities();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const workspaceBadge = currentWorkspace
    ? `${currentWorkspace.name} · ${currentWorkspace.type === "team" ? "Team" : "Personal"}`
    : "Settings control";
  const heroTitle = currentWorkspace
    ? `Fine-tune the TaskFlux experience for ${currentWorkspace.name}.`
    : "Fine-tune the TaskFlux experience for your team.";
  const heroDescription = currentWorkspace && currentWorkspace.type === "team"
    ? "Update workspace preferences, manage notifications, and keep every teammate aligned with the latest configuration."
    : "Update profile details, manage notifications, and align workspace preferences. Your choices sync instantly across devices.";
  const canManageMembers = capabilities.canManageMembers;

  return (
    <DashboardChrome activeHref="/dashboard/settings" onLogout={handleLogout}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 lg:px-10">
        <motion.section
          className="relative overflow-hidden rounded-3xl border border-taskflux-light-gray/60 bg-white shadow-xl shadow-taskflux-sky-blue/10"
          {...fadeInProps}
          transition={{ ...baseTransition, duration: 0.6 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-taskflux-sky-blue/15 via-white to-taskflux-emerald/10" />
          <div className="relative flex flex-col gap-8 p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4 lg:max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-taskflux-sky-blue">
                {workspaceBadge}
              </span>
              <h1 className="text-3xl font-bold text-taskflux-slate-navy lg:text-4xl">{heroTitle}</h1>
              <p className="text-base text-taskflux-cool-gray lg:text-lg">{heroDescription}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-taskflux-slate-navy/80">
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4 text-taskflux-emerald" />
                  Weekly summary scheduled
                </span>
                <span className="inline-flex items-center gap-2">
                  <Badge className="rounded-full bg-taskflux-sky-blue/10 px-3 py-1 text-xs font-semibold text-taskflux-sky-blue">
                    <Globe className="mr-2 h-3.5 w-3.5" />
                    Global
                  </Badge>
                </span>
              </div>
            </div>
            <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-white/60 bg-white/85 p-6 shadow-inner backdrop-blur">
              <div className="flex items-center justify-between text-sm text-taskflux-slate-navy/85">
                <span className="font-semibold">Recent updates</span>
                <span className="rounded-full bg-taskflux-sky-blue/10 px-2 py-0.5 text-xs font-medium text-taskflux-sky-blue">
                  Last synced 2m ago
                </span>
              </div>
              <div className="space-y-3 text-sm text-taskflux-cool-gray/90">
                <p>• Two-factor authentication enabled for 14 teammates.</p>
                <p>• Automation alerts reduced to focus hours only.</p>
                <p>• Workspace color theme updated to Aurora.</p>
              </div>
              <Button
                className={`rounded-full bg-gradient-to-r from-taskflux-sky-blue via-blue-500 to-taskflux-blue-hover text-white shadow-taskflux-sky-blue/25 transition-all hover:scale-[1.02] ${
                  canManageMembers ? "" : "cursor-not-allowed opacity-60 hover:scale-100"
                }`}
                disabled={!canManageMembers}
              >
                Review admin log
              </Button>
              {!canManageMembers && (
                <p className="text-xs text-taskflux-cool-gray/80">
                  Only admins can review the workspace activity log.
                </p>
              )}
            </div>
          </div>
        </motion.section>

        <motion.section
          className="grid gap-6 lg:grid-cols-[280px,minmax(0,1fr)]"
          {...fadeInProps}
          transition={{ ...baseTransition, delay: 0.05 }}
        >
          <Card className="h-fit rounded-3xl border border-taskflux-light-gray/60 bg-white/95 p-3 shadow-sm">
            <nav className="flex flex-col gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:-translate-y-[1px] ${
                      isActive
                        ? "bg-taskflux-sky-blue/10 text-taskflux-sky-blue shadow-inner"
                        : "text-taskflux-cool-gray hover:bg-taskflux-pale-gray"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-taskflux-sky-blue" : "text-taskflux-cool-gray"}`} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </Card>

          <div className="space-y-6">
            {activeTab === "profile" && <ProfilePanel />}
            {activeTab === "notifications" && (
              <NotificationsPanel notifications={notifications} onChange={setNotifications} />
            )}
            {activeTab === "privacy" && (
              <PrivacyPanel
                privacy={privacy}
                onChange={setPrivacy}
                canManageMembers={canManageMembers}
              />
            )}
            {activeTab === "appearance" && <AppearancePanel />}
            {activeTab === "account" && (
              <AccountPanel workspace={currentWorkspace ?? null} capabilities={capabilities} />
            )}
          </div>
        </motion.section>
      </div>
    </DashboardChrome>
  );
}

function ProfilePanel() {
  return (
    <Card className="rounded-3xl border border-taskflux-light-gray/60 bg-white/95 shadow-sm">
      <CardHeader className="border-b border-taskflux-light-gray/60 pb-6">
        <CardTitle className="flex items-center gap-3 text-xl font-semibold text-taskflux-slate-navy">
          <User className="h-5 w-5 text-taskflux-sky-blue" />
          Profile information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-taskflux-sky-blue via-blue-500 to-taskflux-blue-hover text-2xl font-bold text-white">
            <div className="flex h-full w-full items-center justify-center">JD</div>
            <Button size="icon" className="absolute -bottom-2 -right-2 h-9 w-9 rounded-full bg-taskflux-slate-navy text-white hover:bg-taskflux-slate-navy/90">
              <Upload className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full bg-taskflux-sky-blue/10 px-3 py-1 text-xs font-semibold text-taskflux-sky-blue">
              Product manager
            </span>
            <h3 className="text-xl font-semibold text-taskflux-slate-navy">John Doe</h3>
            <Badge variant="outline" className="border-taskflux-emerald/40 bg-taskflux-emerald/10 text-taskflux-emerald">
              Pro workspace
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Field label="First name" defaultValue="John" id="profile-first-name" />
          <Field label="Last name" defaultValue="Doe" id="profile-last-name" />
          <Field label="Email" defaultValue="john.doe@example.com" id="profile-email" type="email" />
          <Field label="Phone" defaultValue="+1 (555) 123-4567" id="profile-phone" />
          <Field label="Job title" defaultValue="Product Manager" id="profile-title" />
          <Field label="Location" defaultValue="New York, USA" id="profile-location" />
        </div>

        <div className="flex justify-end">
          <Button className="rounded-full bg-gradient-to-r from-taskflux-sky-blue via-blue-500 to-taskflux-blue-hover text-white shadow-taskflux-sky-blue/20">
            <Save className="mr-2 h-4 w-4" />
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationsPanel({
  notifications,
  onChange,
}: {
  notifications: { email: boolean; push: boolean; desktop: boolean; weekly: boolean };

  onChange: Dispatch<
    SetStateAction<{ email: boolean; push: boolean; desktop: boolean; weekly: boolean }>
  >;
}) {
  return (
    <Card className="rounded-3xl border border-taskflux-light-gray/60 bg-white/95 shadow-sm">
      <CardHeader className="border-b border-taskflux-light-gray/60 pb-6">
        <CardTitle className="flex items-center gap-3 text-xl font-semibold text-taskflux-slate-navy">
          <Bell className="h-5 w-5 text-taskflux-sky-blue" />
          Notification preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <NotificationToggle
            label="Email alerts"
            description="Weekly summaries and important workspace changes."
            active={notifications.email}
            onClick={() => onChange((prev) => ({ ...prev, email: !prev.email }))}
          />
          <NotificationToggle
            label="Push notifications"
            description="Real-time updates on mobile devices."
            active={notifications.push}
            onClick={() => onChange((prev) => ({ ...prev, push: !prev.push }))}
          />
          <NotificationToggle
            label="Desktop banners"
            description="Heads-up notifications inside TaskFlux."
            active={notifications.desktop}
            onClick={() => onChange((prev) => ({ ...prev, desktop: !prev.desktop }))}
          />
          <NotificationToggle
            label="Weekly digest"
            description="Every Monday at 9 AM."
            active={notifications.weekly}
            onClick={() => onChange((prev) => ({ ...prev, weekly: !prev.weekly }))}
          />
        </div>

        <div className="rounded-2xl border border-taskflux-light-gray/60 bg-taskflux-pale-gray/60 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.35em] text-taskflux-cool-gray">
            Subscriptions
          </h4>
          <div className="mt-4 grid gap-3 text-sm text-taskflux-cool-gray/90 md:grid-cols-2">
            <Badge variant="outline" className="justify-center rounded-full border-taskflux-light-gray/70 bg-white/90 py-2">
              Task updates
            </Badge>
            <Badge variant="outline" className="justify-center rounded-full border-taskflux-light-gray/70 bg-white/90 py-2">
              Launch announcements
            </Badge>
            <Badge variant="outline" className="justify-center rounded-full border-taskflux-light-gray/70 bg-white/90 py-2">
              Automation alerts
            </Badge>
            <Badge variant="outline" className="justify-center rounded-full border-taskflux-light-gray/70 bg-white/90 py-2">
              Billing notices
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PrivacyPanel({
  privacy,
  onChange,
  canManageMembers,
}: {
  privacy: { profilePublic: boolean; showOnlineStatus: boolean; allowDirectMessages: boolean };
  onChange: Dispatch<
    SetStateAction<{ profilePublic: boolean; showOnlineStatus: boolean; allowDirectMessages: boolean }>
  >;
  canManageMembers: boolean;
}) {
  return (
    <Card className="rounded-3xl border border-taskflux-light-gray/60 bg-white/95 shadow-sm">
      <CardHeader className="border-b border-taskflux-light-gray/60 pb-6">
        <CardTitle className="flex items-center gap-3 text-xl font-semibold text-taskflux-slate-navy">
          <Shield className="h-5 w-5 text-taskflux-sky-blue" />
          Privacy & security
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8 p-6">
        <div className="space-y-4">
          <PrivacyToggle
            label="Public profile"
            description="Let teammates find you when sharing automations."
            active={privacy.profilePublic}
            onClick={() => onChange((prev) => ({ ...prev, profilePublic: !prev.profilePublic }))}
          />
          <PrivacyToggle
            label="Online status"
            description="Show when you are available for quick approvals."
            active={privacy.showOnlineStatus}
            onClick={() => onChange((prev) => ({ ...prev, showOnlineStatus: !prev.showOnlineStatus }))}
          />
          <PrivacyToggle
            label="Direct messages"
            description="Allow workspace members to reach you directly."
            active={privacy.allowDirectMessages}
            onClick={() => onChange((prev) => ({ ...prev, allowDirectMessages: !prev.allowDirectMessages }))}
          />
        </div>

        <div className="rounded-2xl border border-taskflux-light-gray/60 bg-taskflux-pale-gray/60 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.35em] text-taskflux-cool-gray">
            Data management
          </h4>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Button
              variant="outline"
              className={`justify-start rounded-2xl border-taskflux-light-gray/70 text-taskflux-slate-navy ${
                canManageMembers ? "" : "cursor-not-allowed opacity-60"
              }`}
              disabled={!canManageMembers}
            >
              <Download className="mr-2 h-4 w-4" />
              Export workspace data
            </Button>
            <Button
              variant="outline"
              className={`justify-start rounded-2xl border-taskflux-light-gray/70 text-taskflux-slate-navy ${
                canManageMembers ? "" : "cursor-not-allowed opacity-60"
              }`}
              disabled={!canManageMembers}
            >
              <Shield className="mr-2 h-4 w-4" />
              Request privacy report
            </Button>
          </div>
          {!canManageMembers && (
            <p className="mt-3 text-xs text-taskflux-cool-gray/80">
              Only admins can export workspace data or request privacy reports.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AppearancePanel() {
  return (
    <Card className="rounded-3xl border border-taskflux-light-gray/60 bg-white/95 shadow-sm">
      <CardHeader className="border-b border-taskflux-light-gray/60 pb-6">
        <CardTitle className="flex items-center gap-3 text-xl font-semibold text-taskflux-slate-navy">
          <Palette className="h-5 w-5 text-taskflux-sky-blue" />
          Appearance & theme
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8 p-6">
        <div className="space-y-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.35em] text-taskflux-cool-gray">
            Theme preference
          </h4>
          <div className="grid gap-4 md:grid-cols-3">
            <ThemeTile title="Light" description="Bright workspace" active />
            <ThemeTile title="Dark" description="Low-light friendly" />
            <ThemeTile title="System" description="Follow OS setting" icon={<Monitor className="h-4 w-4 text-taskflux-cool-gray" />} />
          </div>
        </div>

        <div className="rounded-2xl border border-taskflux-light-gray/60 bg-taskflux-pale-gray/60 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.35em] text-taskflux-cool-gray">
            Interface options
          </h4>
          <div className="mt-4 space-y-3">
            <InterfaceToggle label="Compact mode" status="Off" />
            <InterfaceToggle label="Reduced motion" status="Off" />
            <InterfaceToggle label="High contrast" status="Off" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AccountPanel({
  workspace,
  capabilities,
}: {
  workspace: Workspace | null;
  capabilities: WorkspaceCapabilities;
}) {
  const canManageBilling = capabilities.canManageBilling;
  const canDeleteWorkspace = workspace?.type === "team" ? capabilities.canDeleteTeam : true;
  const isTeamWorkspace = workspace?.type === "team";
  const dangerTitle = isTeamWorkspace ? "Workspace danger zone" : "Account danger zone";
  const dangerDescription = isTeamWorkspace
    ? "Deleting this workspace removes automations, records, and integrations for every member. This action cannot be undone."
    : "Deleting your account removes all workspaces, automations, and integrations. This action cannot be undone.";
  const dangerButtonLabel = isTeamWorkspace ? "Delete workspace" : "Delete account";
  const dangerHelper = isTeamWorkspace && !capabilities.canDeleteTeam
    ? "Only the workspace owner can delete this team."
    : undefined;

  return (
    <Card className="rounded-3xl border border-taskflux-light-gray/60 bg-white/95 shadow-sm">
      <CardHeader className="border-b border-taskflux-light-gray/60 pb-6">
        <CardTitle className="flex items-center gap-3 text-xl font-semibold text-taskflux-slate-navy">
          <Key className="h-5 w-5 text-taskflux-sky-blue" />
          Account management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl border border-taskflux-light-gray/60 bg-taskflux-pale-gray/50 p-4 shadow-none">
            <h4 className="text-sm font-semibold uppercase tracking-[0.35em] text-taskflux-cool-gray">
              Security
            </h4>
            <div className="mt-4 space-y-3">
              <Button variant="outline" className="w-full justify-start rounded-2xl border-taskflux-light-gray/70 text-taskflux-slate-navy">
                <Key className="mr-2 h-4 w-4" />
                Change password
              </Button>
              <Button variant="outline" className="w-full justify-start rounded-2xl border-taskflux-light-gray/70 text-taskflux-slate-navy">
                <Shield className="mr-2 h-4 w-4" />
                Two-factor authentication
              </Button>
            </div>
          </Card>

          <Card className="rounded-2xl border border-taskflux-light-gray/60 bg-taskflux-pale-gray/50 p-4 shadow-none">
            <h4 className="text-sm font-semibold uppercase tracking-[0.35em] text-taskflux-cool-gray">
              Subscription
            </h4>
            <div className="mt-4 flex flex-col gap-2 text-sm text-taskflux-cool-gray/90">
              <span>Current plan: <strong className="text-taskflux-slate-navy">Pro workspace</strong></span>
              <span>Next billing: 15 March 2024</span>
            </div>
            <Button
              variant="outline"
              className={`mt-4 w-full rounded-2xl border-taskflux-light-gray/70 text-taskflux-slate-navy ${
                canManageBilling ? "" : "cursor-not-allowed opacity-60"
              }`}
              disabled={!canManageBilling}
            >
              Manage plan
            </Button>
            {!canManageBilling && (
              <p className="mt-2 text-xs text-taskflux-cool-gray/80">
                Billing settings are limited to workspace owners.
              </p>
            )}
          </Card>
        </div>

        <Card className="rounded-2xl border border-taskflux-red/40 bg-taskflux-red/10 p-5 text-taskflux-slate-navy shadow-none">
          <h4 className="text-sm font-semibold uppercase tracking-[0.35em] text-taskflux-red">{dangerTitle}</h4>
          <p className="mt-3 text-sm text-taskflux-slate-navy/80">
            {dangerDescription}
          </p>
          <Button
            variant="destructive"
            className={`mt-4 w-full rounded-2xl ${canDeleteWorkspace ? "" : "cursor-not-allowed opacity-60"}`}
            disabled={!canDeleteWorkspace}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {dangerButtonLabel}
          </Button>
          {dangerHelper && (
            <p className="mt-2 text-xs text-taskflux-cool-gray/85">{dangerHelper}</p>
          )}
        </Card>
      </CardContent>
    </Card>
  );
}

function Field({ label, id, defaultValue, type = "text" }: { label: string; id: string; defaultValue: string; type?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-taskflux-slate-navy/80">
        {label}
      </Label>
      <Input
        id={id}
        defaultValue={defaultValue}
        type={type}
        className="rounded-2xl border-taskflux-light-gray/70 bg-white/95 text-taskflux-slate-navy shadow-sm focus-visible:ring-taskflux-sky-blue"
      />
    </div>
  );
}

function NotificationToggle({
  label,
  description,
  active,
  onClick,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-taskflux-light-gray/60 bg-taskflux-pale-gray/40 p-5 md:flex-row md:items-center">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-taskflux-slate-navy">{label}</h4>
        <p className="text-sm text-taskflux-cool-gray/90">{description}</p>
      </div>
      <Button
        variant={active ? "default" : "outline"}
        className={`rounded-full px-6 ${active ? "bg-taskflux-slate-navy text-white hover:bg-taskflux-slate-navy/90" : "border-taskflux-light-gray/80 text-taskflux-slate-navy"}`}
        onClick={onClick}
      >
        {active ? "On" : "Off"}
      </Button>
    </div>
  );
}

function PrivacyToggle({
  label,
  description,
  active,
  onClick,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-taskflux-light-gray/60 bg-taskflux-pale-gray/50 p-5 md:flex-row md:items-center">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-taskflux-slate-navy">{label}</h4>
        <p className="text-sm text-taskflux-cool-gray/90">{description}</p>
      </div>
      <Button
        variant={active ? "default" : "outline"}
        className={`rounded-full px-6 ${active ? "bg-taskflux-emerald text-white hover:bg-taskflux-emerald/90" : "border-taskflux-light-gray/80 text-taskflux-slate-navy"}`}
        onClick={onClick}
      >
        {active ? "Enabled" : "Disabled"}
      </Button>
    </div>
  );
}

function ThemeTile({
  title,
  description,
  active,
  icon,
}: {
  title: string;
  description: string;
  active?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-taskflux-light-gray/60 p-4 transition-all duration-200 ${
        active
          ? "border-taskflux-sky-blue bg-taskflux-sky-blue/10 shadow-md"
          : "bg-white/90 hover:-translate-y-1 hover:shadow"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-taskflux-slate-navy">{title}</span>
        {icon}
      </div>
      <p className="text-xs text-taskflux-cool-gray/90">{description}</p>
      <div className={`h-20 rounded-xl ${active ? "bg-gradient-to-r from-taskflux-sky-blue/60 via-blue-500/60 to-taskflux-blue-hover/60" : "bg-taskflux-pale-gray/70"}`} />
    </div>
  );
}

function InterfaceToggle({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-taskflux-light-gray/60 bg-white/95 px-4 py-3 text-sm text-taskflux-slate-navy">
      <span>{label}</span>
      <Button variant="outline" className="rounded-full border-taskflux-light-gray/80 text-taskflux-cool-gray/90" size="sm">
        {status}
      </Button>
    </div>
  );
}
