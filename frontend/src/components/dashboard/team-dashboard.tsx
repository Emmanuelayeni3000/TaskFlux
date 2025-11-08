"use client";

import { useMemo, useState } from "react";

import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle,
  FolderOpen,
  MoreHorizontal,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";

// Define types for project with tasks and counts
type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";

interface ProjectTask {
  id: string;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "ARCHIVED";
  dueDate?: string;
}

interface ProjectWithTasks {
  id: string;
  title: string;
  name?: string;
  description?: string | null;
  status: ProjectStatus;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  tasks?: ProjectTask[];
  _count?: {
    tasks: number;
  };
}

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentWorkspace } from "@/store/workspaceStore";
import { useWorkspaceProjects } from "@/hooks/use-workspace-projects";
import { useWorkspaceTasks } from "@/hooks/use-workspace-tasks";
import { ProjectModal } from "@/components/modals/project-modal";
import { TaskModal } from "@/components/modals/task-modal";



const fadeInProps = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

export function TeamDashboard() {
  const currentWorkspace = useCurrentWorkspace();
  const [selectedProject, setSelectedProject] = useState<ProjectWithTasks | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const {
    projects,
    isLoading: projectsLoading,
  } = useWorkspaceProjects();

  const {
    isLoading: tasksLoading,
  } = useWorkspaceTasks();

  const projectAnalytics = useMemo(() => {
    if (!projects.length) {
      return {
        total: 0,
        active: 0,
        completed: 0,
        planning: 0,
        onHold: 0,
        totalTasks: 0,
        completedTasks: 0,
      };
    }

    const total = projects.length;
    const active = projects.filter(p => p.status === "ACTIVE").length;
    const completed = projects.filter(p => p.status === "COMPLETED").length;
    const planning = projects.filter(p => p.status === "PLANNING").length;
    const onHold = projects.filter(p => p.status === "ON_HOLD").length;

    const totalTasks = projects.reduce((acc, project) => acc + ((project as ProjectWithTasks)._count?.tasks || 0), 0);
    const completedTasks = projects.reduce((acc, project) => {
      return acc + ((project as ProjectWithTasks).tasks?.filter((task: ProjectTask) => task.status === "DONE").length || 0);
    }, 0);

    return {
      total,
      active,
      completed,
      planning,
      onHold,
      totalTasks,
      completedTasks,
    };
  }, [projects]);

  const handleProjectClick = (project: ProjectWithTasks) => {
    setSelectedProject(project);
    setIsProjectModalOpen(true);
  };

  const handleCreateProject = () => {
    setSelectedProject(null);
    setIsProjectModalOpen(true);
  };

  const handleCreateTask = () => {
    setIsTaskModalOpen(true);
  };

  if (projectsLoading || tasksLoading) {
    return (
      <div className="space-y-8 p-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <motion.div {...fadeInProps} className="space-y-2">
        <h1 className="text-3xl font-bold text-taskflux-slate-navy">
          {currentWorkspace?.name} Dashboard
        </h1>
        <p className="text-taskflux-cool-gray">
          Monitor team initiatives, track deliverables, and keep projects on schedule.
        </p>
      </motion.div>

      {/* Analytics Cards */}
      <motion.div 
        {...fadeInProps}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        <Card className="border-taskflux-light-gray/70 bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-taskflux-cool-gray">
              Active Projects
            </CardTitle>
            <FolderOpen className="h-4 w-4 text-taskflux-sky-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-taskflux-slate-navy">
              {projectAnalytics.active}
            </div>
            <p className="text-xs text-taskflux-cool-gray/80">
              {projectAnalytics.total} total projects
            </p>
          </CardContent>
        </Card>

        <Card className="border-taskflux-light-gray/70 bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-taskflux-cool-gray">
              Team Tasks
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-taskflux-emerald" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-taskflux-slate-navy">
              {projectAnalytics.completedTasks}/{projectAnalytics.totalTasks}
            </div>
            <p className="text-xs text-taskflux-cool-gray/80">
              {projectAnalytics.totalTasks > 0 
                ? Math.round((projectAnalytics.completedTasks / projectAnalytics.totalTasks) * 100)
                : 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-taskflux-light-gray/70 bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-taskflux-cool-gray">
              Completed
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-taskflux-emerald" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-taskflux-slate-navy">
              {projectAnalytics.completed}
            </div>
            <p className="text-xs text-taskflux-cool-gray/80">
              Projects delivered
            </p>
          </CardContent>
        </Card>

        <Card className="border-taskflux-light-gray/70 bg-white/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-taskflux-cool-gray">
              Team Members
            </CardTitle>
            <Users className="h-4 w-4 text-taskflux-cool-gray" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-taskflux-slate-navy">
              1
            </div>
            <p className="text-xs text-taskflux-cool-gray/80">
              Active members
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Projects Grid */}
      <motion.div {...fadeInProps} className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-taskflux-slate-navy">
            Active Projects
          </h2>
          <div className="flex gap-2">
            <Button
              onClick={handleCreateTask}
              variant="outline"
              size="sm"
              className="border-taskflux-light-gray/70"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
            <Button
              onClick={handleCreateProject}
              size="sm"
              className="bg-taskflux-sky-blue hover:bg-taskflux-blue-hover"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>

        {projects.length === 0 ? (
          <Card className="border-dashed border-taskflux-light-gray/70 bg-taskflux-pale-gray/30">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-taskflux-cool-gray/60 mb-4" />
              <h3 className="text-lg font-semibold text-taskflux-slate-navy mb-2">
                No projects yet
              </h3>
              <p className="text-taskflux-cool-gray text-center mb-6 max-w-md">
                Create your first project to start organizing team initiatives and tracking deliverables.
              </p>
              <Button
                onClick={handleCreateProject}
                className="bg-taskflux-sky-blue hover:bg-taskflux-blue-hover"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project as ProjectWithTasks}
                onClick={() => handleProjectClick(project as ProjectWithTasks)}
                delay={index * 0.1}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <ProjectModal
        open={isProjectModalOpen}
        onOpenChange={setIsProjectModalOpen}
        project={selectedProject ? {
          id: selectedProject.id,
          title: selectedProject.title,
          description: selectedProject.description,
          status: selectedProject.status as ProjectStatus,
          startDate: selectedProject.startDate,
          endDate: selectedProject.endDate,
          dueDate: null, // ProjectWithTasks doesn't have dueDate, so set to null
        } : undefined}
        onSuccess={() => {
          setIsProjectModalOpen(false);
        }}
      />

      <TaskModal
        open={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
        onSuccess={() => {
          setIsTaskModalOpen(false);
        }}
      />
    </div>
  );
}

interface ProjectCardProps {
  project: ProjectWithTasks;
  onClick: () => void;
  delay?: number;
}

function ProjectCard({ project, onClick, delay = 0 }: ProjectCardProps) {
  const taskCount = project._count?.tasks || 0;
  const completedTasks = project.tasks?.filter((task: ProjectTask) => task.status === "DONE").length || 0;
  const progress = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PLANNING":
        return "bg-taskflux-sky-blue/10 text-taskflux-sky-blue border-taskflux-sky-blue/20";
      case "ACTIVE":
        return "bg-taskflux-emerald/10 text-taskflux-emerald border-taskflux-emerald/20";
      case "ON_HOLD":
        return "bg-taskflux-amber/10 text-taskflux-amber border-taskflux-amber/20";
      case "COMPLETED":
        return "bg-taskflux-cool-gray/10 text-taskflux-cool-gray border-taskflux-cool-gray/20";
      default:
        return "bg-taskflux-pale-gray text-taskflux-slate-navy border-taskflux-light-gray";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PLANNING":
        return "Planning";
      case "ACTIVE":
        return "Active";
      case "ON_HOLD":
        return "On Hold";
      case "COMPLETED":
        return "Completed";
      default:
        return status;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card
        className="cursor-pointer border-taskflux-light-gray/70 bg-white/90 transition-all hover:shadow-lg hover:border-taskflux-sky-blue/50"
        onClick={onClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              <CardTitle className="text-lg text-taskflux-slate-navy truncate">
                {project.title || project.name}
              </CardTitle>
              {project.description && (
                <p className="text-sm text-taskflux-cool-gray line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-taskflux-pale-gray"
              onClick={(e) => {
                e.stopPropagation();
                // Add menu options here
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={`text-xs font-medium ${getStatusColor(project.status)}`}
            >
              {getStatusLabel(project.status)}
            </Badge>
            {taskCount > 0 && (
              <span className="text-xs text-taskflux-cool-gray">
                {completedTasks}/{taskCount} tasks
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {taskCount > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-taskflux-cool-gray">Progress</span>
                <span className="font-medium text-taskflux-slate-navy">{progress}%</span>
              </div>
              <div className="w-full bg-taskflux-pale-gray/60 rounded-full h-2">
                <div
                  className="bg-taskflux-sky-blue h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {project.endDate && (
            <div className="flex items-center gap-1 mt-3 text-xs text-taskflux-cool-gray">
              <Calendar className="h-3 w-3" />
              <span>Due {new Date(project.endDate).toLocaleDateString()}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}