"use client";

import type { ComponentType, SVGProps } from "react";
import { useMemo, useState } from "react";

import { useRouter } from "next/navigation";
import { motion, type Transition } from "framer-motion";
import {
  BarChart3,
  FolderOpen,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardChrome } from "../_components/dashboard-chrome";
import { useAuthStore } from "@/store/authStore";
import { useCurrentWorkspace } from "@/store/workspaceStore";
import { useWorkspaceCapabilities } from "@/hooks/use-workspace-capabilities";
import { useWorkspaceProjects } from "@/hooks/use-workspace-projects";
import { ProjectModal } from "@/components/modals/project-modal";

export default function ProjectsPage() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const currentWorkspace = useCurrentWorkspace();
  const capabilities = useWorkspaceCapabilities();
  const {
    projects,
    isLoading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
  } = useWorkspaceProjects();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const canManageProjects = capabilities.canManageProjects;
  const workspaceBadge = currentWorkspace
    ? `${currentWorkspace.name} · ${currentWorkspace.type === "team" ? "Team" : "Personal"}`
    : "Portfolio Health";
  const heroTitle = currentWorkspace && currentWorkspace.type === "team"
    ? `Guide ${currentWorkspace.name} initiatives from kickoff to win.`
    : "Guide every initiative from kickoff to win.";
  const heroDescription = currentWorkspace && currentWorkspace.type === "team"
    ? "Align teammates, surface risks early, and keep delivery predictable across this workspace."
    : "Align teams, surface risks early, and keep delivery predictable. TaskFlux projects layer automations and insights directly into your roadmap.";

  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  const projectAnalytics = useMemo(() => {
    if (!projects.length) {
      return {
        total: 0,
        active: 0,
        completed: 0,
        planning: 0,
        launchingThisMonth: 0,
        onHold: 0,
      };
    }

    const now = new Date();
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const total = projects.length;
    const active = projects.filter(p => p.status === "ACTIVE").length;
    const completed = projects.filter(p => p.status === "COMPLETED").length;
    const planning = projects.filter(p => p.status === "PLANNING").length;
    const onHold = projects.filter(p => p.status === "ON_HOLD").length;
    
    const launchingThisMonth = projects.filter(p => {
      if (!p.endDate || p.status === "COMPLETED") return false;
      const endDate = new Date(p.endDate);
      return endDate <= thisMonthEnd && endDate >= now;
    }).length;

    return {
      total,
      active,
      completed,
      planning,
      launchingThisMonth,
      onHold,
    };
  }, [projects]);

  // Redirect if user is in a personal workspace (projects only available in team workspaces)
  if (currentWorkspace && currentWorkspace.type === "personal") {
    router.replace("/dashboard");
    return null;
  }

  const projectMetrics: Metric[] = [
    {
      label: "Active initiatives",
      value: projectAnalytics.active.toString(),
      change: `+${Math.max(0, projectAnalytics.active - projectAnalytics.completed)} vs completed`,
      icon: FolderOpen,
      accent: "taskflux-sky-blue",
    },
    {
      label: "Total stakeholders",
      value: (projectAnalytics.total * 3.2).toFixed(0), // Estimated stakeholders per project
      change: `${Math.round((projectAnalytics.active / Math.max(1, projectAnalytics.total)) * 100)}% engagement`,
      icon: Users,
      accent: "taskflux-emerald",
    },
    {
      label: "Delivery confidence",
      value: `${Math.round((projectAnalytics.completed / Math.max(1, projectAnalytics.total)) * 100)}%`,
      change: `${projectAnalytics.completed}/${projectAnalytics.total} completed`,
      icon: BarChart3,
      accent: "taskflux-amber",
    },
  ];

  if (projectsLoading) {
    return (
      <DashboardChrome activeHref="/dashboard/projects" onLogout={handleLogout}>
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-4 px-4 py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-taskflux-sky-blue"></div>
          <p className="text-taskflux-cool-gray">Loading projects...</p>
        </div>
      </DashboardChrome>
    );
  }

  if (projectsError) {
    return (
      <DashboardChrome activeHref="/dashboard/projects" onLogout={handleLogout}>
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-4 px-4 py-20">
          <p className="text-red-600">Error loading projects: {projectsError}</p>
          <button
            onClick={refetchProjects}
            className="px-4 py-2 bg-taskflux-sky-blue text-white rounded-lg hover:bg-taskflux-blue-hover transition-colors"
          >
            Try Again
          </button>
        </div>
      </DashboardChrome>
    );
  }

  return (
    <DashboardChrome activeHref="/dashboard/projects" onLogout={handleLogout}>
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
                  <TrendingUp className="h-4 w-4 text-taskflux-emerald" />
                  18% faster cycle time this quarter
                </span>
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-taskflux-amber" />
                  5 launches scheduled
                </span>
              </div>
            </div>
            <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/60 bg-white/80 p-6 shadow-inner backdrop-blur lg:w-80">
              <div className="flex items-center justify-between text-sm text-taskflux-slate-navy/80">
                <span className="font-semibold">Up next</span>
                <span className="rounded-full bg-taskflux-sky-blue/10 px-2 py-0.5 text-xs font-medium text-taskflux-sky-blue">Sprint 14</span>
              </div>
              <div className="space-y-2 text-sm text-taskflux-cool-gray/90">
                <p>• Finalise automation launch for Ops</p>
                <p>• Prep customer advisory board deck</p>
                <p>• Kickoff mobile beta cohort</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-taskflux-cool-gray">
                <div className="rounded-xl border border-taskflux-light-gray/60 bg-taskflux-pale-gray/40 px-3 py-2">
                  <div className="font-semibold text-taskflux-slate-navy">{projectAnalytics.active}</div>
                  Active projects
                </div>
                <div className="rounded-xl border border-taskflux-light-gray/60 bg-taskflux-pale-gray/40 px-3 py-2">
                  <div className="font-semibold text-taskflux-slate-navy">{projectAnalytics.launchingThisMonth}</div>
                  Launching this month
                </div>
              </div>
              {canManageProjects ? (
                <Button 
                  className="rounded-full bg-gradient-to-r from-taskflux-sky-blue via-blue-500 to-taskflux-blue-hover text-white shadow-taskflux-sky-blue/20 transition-all hover:scale-[1.02] relative z-10 pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsNewProjectModalOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New project
                </Button>
              ) : (
                <Button
                  className="cursor-not-allowed opacity-60 rounded-full bg-gradient-to-r from-taskflux-sky-blue via-blue-500 to-taskflux-blue-hover text-white shadow-taskflux-sky-blue/20"
                  disabled
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New project
                </Button>
              )}
              {!canManageProjects && (
                <p className="text-xs text-taskflux-cool-gray/80">
                  You need admin-level access to create projects in this workspace.
                </p>
              )}
            </div>
          </div>
        </motion.section>

        <motion.section {...fadeInProps} transition={{ ...baseTransition, delay: 0.05 }}>
          <div className="grid gap-4 md:grid-cols-3">
            {projectMetrics.map((metric) => (
              <ProjectMetric key={metric.label} {...metric} />
            ))}
          </div>
        </motion.section>


      </div>

      {/* New Project Modal */}
      <ProjectModal
        open={isNewProjectModalOpen}
        onOpenChange={setIsNewProjectModalOpen}
        onSuccess={() => {
          setIsNewProjectModalOpen(false);
          refetchProjects();
        }}
      />
    </DashboardChrome>
  );
}

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];
const baseTransition: Transition = { duration: 0.45, ease };
const fadeInProps = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

type Metric = {
  label: string;
  value: string;
  change: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent: string;
};



function ProjectMetric({ label, value, change, icon: Icon, accent }: Metric) {
  return (
    <Card className="relative overflow-hidden rounded-2xl border border-taskflux-light-gray/60 bg-white/95 shadow-sm">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-taskflux-cool-gray">{label}</p>
          <div className="text-3xl font-bold text-taskflux-slate-navy">{value}</div>
          <p className="text-sm text-taskflux-cool-gray/90">{change}</p>
        </div>
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `rgba(var(--${accent}), 0.12)` }}
        >
          <Icon className="h-7 w-7" style={{ color: `rgb(var(--${accent}))` }} />
        </div>
      </CardContent>
    </Card>
  );
}


