'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Users, Zap, ArrowRight, BarChart3, Sparkles, Mail, Linkedin, Twitter, ShieldCheck, UserCheck, Eye } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";

export default function LandingPage() {
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const scaleOnHover = {
    scale: 1.05, 
    y: -5
  };

  const howItWorksSteps = [
    {
      badge: "Plan",
      title: "Shape focused workspaces",
      description: "Start every initiative with clarity using templates, intake forms, and shared priorities that keep your team aligned from day one.",
      points: [
        "Import existing backlog items or spin up blueprints in seconds",
        "Assign roles, SLAs, and confidence levels before kick-off"
      ],
      accent: "from-taskflux-sky-blue via-blue-500 to-taskflux-blue-hover",
      dot: "bg-taskflux-sky-blue",
      numberBg: "bg-taskflux-sky-blue/10",
      numberText: "text-taskflux-sky-blue"
    },
    {
      badge: "Execute",
      title: "Keep momentum every day",
      description: "Visualise progress across views, surface blockers instantly, and celebrate wins with real-time updates that everyone can trust.",
      points: [
        "Switch between timeline, kanban, and focus mode without losing context",
        "Share live status boards with stakeholders in a single click"
      ],
      accent: "from-taskflux-emerald via-emerald-500 to-taskflux-emerald",
      dot: "bg-taskflux-emerald",
      numberBg: "bg-taskflux-emerald/10",
      numberText: "text-taskflux-emerald"
    },
    {
      badge: "Optimize",
      title: "Automate and learn fast",
      description: "Let TaskFlux remove the busywork with automations while analytics highlight trends, risks, and the next best action for your team.",
      points: [
        "Trigger smart nudges, reminders, and dependency alerts automatically",
        "Track effort vs. impact with weekly health snapshots"
      ],
      accent: "from-taskflux-amber via-orange-400 to-taskflux-red",
      dot: "bg-taskflux-amber",
      numberBg: "bg-taskflux-amber/10",
      numberText: "text-taskflux-amber"
    }
  ];

  const roleHighlights: {
    title: string;
    summary: string;
    details: string;
    footnote: string;
    icon: typeof CheckCircle;
    accent: string;
  }[] = [
    {
      title: "Owners & Admins",
      summary: "Set the guardrails",
      details: "Full control over workspaces, membership, and automation policies keeps the right people unblocked without sacrificing governance.",
      footnote: "Owners keep billing and workspace lifecycle decisions, while admins manage members, automations, and project scopes.",
      icon: ShieldCheck,
      accent: "from-taskflux-sky-blue via-blue-500 to-taskflux-blue-hover",
    },
    {
      title: "Members",
      summary: "Ship with confidence",
      details: "Collaborate on tasks, update status, and trigger playbooks while TaskFlux prevents accidental scope changes outside your permissions.",
      footnote: "Members can create tasks when enabled and update deliverables, but project structure and team settings stay protected.",
      icon: UserCheck,
      accent: "from-taskflux-emerald via-emerald-500 to-taskflux-emerald",
    },
    {
      title: "Viewers",
      summary: "Stay in the loop",
      details: "Share dashboards with stakeholders who need transparency, not edit access, so insights travel fast without noisy handoffs.",
      footnote: "Stakeholders get read-only dashboards and health snapshots, reducing back-and-forth for status updates.",
      icon: Eye,
      accent: "from-taskflux-amber via-orange-400 to-taskflux-red",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-taskflux-background">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-taskflux-surface/90 backdrop-blur-md shadow-sm border-b border-taskflux-light-gray"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
          <motion.div 
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Image src="/taskflux-logo.png" alt="TaskFlux logo" width={100} height={80} className="rounded-2xl" />
            {/* <span className="text-xl font-bold text-taskflux-slate-navy">TaskFlux</span> */}
          </motion.div>
          <nav className="flex items-center gap-6">
            <Link
              className="group inline-flex items-center text-sm font-semibold text-taskflux-slate-navy/80 transition-all hover:text-taskflux-sky-blue"
              href="/login"
            >
              <span>Sign In</span>
              <span className="ml-1 block h-0.5 w-0 rounded-full bg-taskflux-sky-blue transition-all duration-200 group-hover:w-4" />
            </Link>
            <Link href="/register">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="bg-gradient-to-r from-taskflux-sky-blue via-blue-500 to-taskflux-blue-hover text-white px-5 py-2.5 rounded-lg shadow-lg shadow-taskflux-sky-blue/30 transition-all duration-200">
                  Get Started
                </Button>
              </motion.div>
            </Link>
          </nav>
        </div>
      </motion.header>

      <main className="flex-1">
        {/* Hero Section with Dotted Background */}
        <section className="relative bg-gradient-to-b from-taskflux-surface to-taskflux-pale-gray py-24 overflow-hidden">
          {/* Dotted Background Pattern */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle, #3B82F6 1px, transparent 1px)`,
              backgroundSize: '30px 30px',
              backgroundPosition: '0 0, 15px 15px'
            }}></div>
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle, #10B981 0.5px, transparent 0.5px)`,
              backgroundSize: '50px 50px',
              backgroundPosition: '25px 25px'
            }}></div>
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-taskflux-sky-blue/18 via-transparent to-taskflux-emerald/15" />
          
          {/* Floating Elements */}
          <motion.div
            className="absolute top-20 left-10 w-4 h-4 bg-taskflux-sky-blue rounded-full opacity-60"
            animate={{ 
              y: [0, -20, 0],
              x: [0, 10, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
          <motion.div
            className="absolute top-32 right-16 w-6 h-6 bg-taskflux-emerald rounded-full opacity-40"
            animate={{ 
              y: [0, 15, 0],
              x: [0, -15, 0],
              rotate: [0, 180, 360]
            }}
            transition={{ 
              duration: 6, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
          <motion.div
            className="absolute bottom-32 left-20 w-3 h-3 bg-taskflux-amber rounded-full opacity-50"
            animate={{ 
              y: [0, -10, 0],
              scale: [1, 1.5, 1]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />

          <div className="relative max-w-7xl mx-auto px-4 lg:px-6 text-center space-y-8">
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <motion.h1 
                className="text-5xl font-bold text-taskflux-slate-navy tracking-tight"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                Stay Organized, Stay Productive
              </motion.h1>
              <motion.p 
                className="text-xl text-taskflux-cool-gray max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                TaskFlux helps you manage tasks, track progress, and collaborate with your team in one beautiful, intuitive workspace.
              </motion.p>
            </motion.div>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <Link href="/register">
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button className="bg-gradient-to-r from-taskflux-sky-blue via-blue-500 to-taskflux-blue-hover text-white px-10 py-3 rounded-full shadow-xl shadow-taskflux-sky-blue/30 transition-all duration-200 text-lg font-semibold">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </motion.div>
              </Link>
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button variant="outline" className="border-taskflux-sky-blue/50 text-taskflux-sky-blue hover:bg-taskflux-sky-blue/10 px-8 py-3 rounded-full transition-all duration-200">
                  Watch Demo
                </Button>
              </motion.div>
            </motion.div>

            <motion.div
              className="flex flex-wrap items-center justify-center gap-6 pt-6 text-xs uppercase tracking-[0.3em] text-taskflux-cool-gray/80"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.1 }}
            >
              <span className="text-taskflux-slate-navy/70">Trusted by</span>
              <span className="font-semibold text-taskflux-slate-navy/80">Aurora Labs</span>
              <span className="font-semibold text-taskflux-slate-navy/80">Northwind</span>
              <span className="font-semibold text-taskflux-slate-navy/80">VelocityX</span>
              <span className="font-semibold text-taskflux-slate-navy/80">ZenWork</span>
            </motion.div>
            
            <motion.div 
              className="pt-8"
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.0 }}
            >
              <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto text-left">
                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 320, damping: 24 }}
                >
                  <Card className="group relative bg-taskflux-surface/95 backdrop-blur border border-taskflux-light-gray/70 rounded-2xl shadow-lg overflow-hidden">
                    <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-taskflux-sky-blue via-blue-500 to-taskflux-blue-hover" />
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-wide text-taskflux-cool-gray">
                            Current Sprint
                          </p>
                          <h3 className="text-xl font-semibold text-taskflux-slate-navy">
                            Launch Dashboard
                          </h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-taskflux-sky-blue/10 flex items-center justify-center">
                          <BarChart3 className="w-5 h-5 text-taskflux-sky-blue" />
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-taskflux-light-gray/60">
                        <div
                          className="h-2 rounded-full bg-taskflux-sky-blue"
                          style={{ width: "68%" }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm text-taskflux-cool-gray">
                        <span>17 tasks completed</span>
                        <span className="font-semibold text-taskflux-slate-navy">68% done</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 320, damping: 24 }}
                >
                  <Card className="group relative bg-taskflux-surface/95 backdrop-blur border border-taskflux-light-gray/70 rounded-2xl shadow-lg overflow-hidden">
                    <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-taskflux-emerald via-emerald-500/70 to-taskflux-emerald" />
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-wide text-taskflux-cool-gray">
                            Team Focus
                          </p>
                          <h3 className="text-xl font-semibold text-taskflux-slate-navy">
                            Today&rsquo;s Highlights
                          </h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-taskflux-emerald/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-taskflux-emerald" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-taskflux-slate-navy">Design Review</p>
                            <p className="text-sm text-taskflux-cool-gray">Handoff with product</p>
                          </div>
                          <span className="text-sm font-semibold text-taskflux-emerald">10:30 AM</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-taskflux-slate-navy">Sprint Retro</p>
                            <p className="text-sm text-taskflux-cool-gray">Team sync and wins</p>
                          </div>
                          <span className="text-sm font-semibold text-taskflux-sky-blue">Today</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 320, damping: 24 }}
                >
                  <Card className="group relative bg-taskflux-surface/95 backdrop-blur border border-taskflux-light-gray/70 rounded-2xl shadow-lg overflow-hidden">
                    <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-taskflux-red via-rose-500/70 to-taskflux-red" />
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-wide text-taskflux-cool-gray">
                            Smart Automation
                          </p>
                          <h3 className="text-xl font-semibold text-taskflux-slate-navy">
                            Keeps work moving
                          </h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-taskflux-red/10 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-taskflux-red" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="mt-1 w-2.5 h-2.5 rounded-full bg-taskflux-emerald" />
                          <div>
                            <p className="text-sm font-semibold text-taskflux-slate-navy">Auto-assign urgent tasks</p>
                            <p className="text-sm text-taskflux-cool-gray">Triggered 4 minutes ago</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="mt-1 w-2.5 h-2.5 rounded-full bg-taskflux-amber" />
                          <div>
                            <p className="text-sm font-semibold text-taskflux-slate-navy">Notify channel on blockers</p>
                            <p className="text-sm text-taskflux-cool-gray">Last run 12 minutes ago</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-sm text-taskflux-cool-gray">Automations this week</span>
                        <span className="text-lg font-semibold text-taskflux-slate-navy">28</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Role-based Permissions Section */}
        <section className="relative bg-white py-24">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-taskflux-sky-blue/6 via-transparent to-taskflux-emerald/8" />
          <div className="relative max-w-7xl mx-auto px-4 lg:px-6">
            <motion.div
              className="text-center space-y-4 max-w-3xl mx-auto mb-16"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <motion.span
                className="inline-flex items-center gap-2 rounded-full bg-taskflux-slate-navy/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-taskflux-slate-navy/70"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                Role-Based Permissions
              </motion.span>
              <h2 className="text-3xl font-semibold text-taskflux-slate-navy md:text-4xl">
                Give every teammate the right level of access
              </h2>
              <p className="text-lg text-taskflux-cool-gray">
                TaskFlux maps workspace capabilities to clear roles, so owners safeguard strategy, members stay productive, and stakeholders stay informed without risking accidental changes.
              </p>
            </motion.div>

            <motion.div
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {roleHighlights.map(({ title, summary, details, footnote, icon: Icon, accent }, index) => (
                <motion.div key={title} variants={fadeInUp} transition={{ delay: index * 0.05 }}>
                  <Card className="group relative h-full overflow-hidden border border-taskflux-light-gray/70 bg-taskflux-surface/95 shadow-sm transition-all duration-200 hover:-translate-y-2 hover:shadow-lg">
                    <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
                    <CardContent className="space-y-4 p-6">
                      <div className="flex items-center justify-between">
                        <div className="rounded-xl bg-taskflux-pale-gray p-3 text-taskflux-sky-blue">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-taskflux-cool-gray">
                          {summary}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-xl font-semibold text-taskflux-slate-navy">{title}</h3>
                        <p className="text-sm text-taskflux-cool-gray/90">{details}</p>
                      </div>
                      <div className="rounded-2xl border border-dashed border-taskflux-light-gray/60 bg-white/70 p-4 text-xs text-taskflux-cool-gray">
                        {footnote}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Features Grid Section */}
        <section className="bg-taskflux-pale-gray py-24">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <motion.div 
              className="text-center space-y-4 mb-16"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <motion.div 
                className="inline-block rounded-full bg-taskflux-sky-blue/10 px-4 py-2 text-sm font-medium text-taskflux-sky-blue"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Key Features
              </motion.div>
              <h2 className="text-3xl font-semibold text-taskflux-slate-navy">
                Everything you need to stay organized
              </h2>
              <p className="text-lg text-taskflux-cool-gray max-w-2xl mx-auto">
                TaskFlux is packed with features to help you manage your tasks and projects efficiently.
              </p>
            </motion.div>
            
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              <motion.div variants={fadeInUp}>
                <motion.div whileHover={scaleOnHover} transition={{ type: "spring", stiffness: 300 }}>
                  <Card className="group relative bg-taskflux-surface border border-taskflux-light-gray/70 shadow-sm transition-all duration-300 h-full overflow-hidden">
                    <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-taskflux-sky-blue via-blue-500 to-taskflux-blue-hover opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <CardContent className="p-6 text-center space-y-4">
                      <motion.div 
                        className="w-12 h-12 bg-taskflux-sky-blue/10 rounded-lg flex items-center justify-center mx-auto"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <CheckCircle className="h-6 w-6 text-taskflux-sky-blue" />
                      </motion.div>
                      <h3 className="text-lg font-semibold text-taskflux-slate-navy">Task Management</h3>
                      <p className="text-taskflux-cool-gray text-sm">Create, organize, and prioritize your tasks with ease.</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <motion.div whileHover={scaleOnHover} transition={{ type: "spring", stiffness: 300 }}>
                  <Card className="group relative bg-taskflux-surface border border-taskflux-light-gray/70 shadow-sm transition-all duration-300 h-full overflow-hidden">
                    <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-taskflux-emerald via-emerald-500/80 to-taskflux-emerald opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <CardContent className="p-6 text-center space-y-4">
                      <motion.div 
                        className="w-12 h-12 bg-taskflux-emerald/10 rounded-lg flex items-center justify-center mx-auto"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <Users className="h-6 w-6 text-taskflux-emerald" />
                      </motion.div>
                      <h3 className="text-lg font-semibold text-taskflux-slate-navy">Team Collaboration</h3>
                      <p className="text-taskflux-cool-gray text-sm">Work together seamlessly with your team members.</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <motion.div whileHover={scaleOnHover} transition={{ type: "spring", stiffness: 300 }}>
                  <Card className="group relative bg-taskflux-surface border border-taskflux-light-gray/70 shadow-sm transition-all duration-300 h-full overflow-hidden">
                    <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-taskflux-amber via-orange-400 to-taskflux-amber opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <CardContent className="p-6 text-center space-y-4">
                      <motion.div 
                        className="w-12 h-12 bg-taskflux-amber/10 rounded-lg flex items-center justify-center mx-auto"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <BarChart3 className="h-6 w-6 text-taskflux-amber" />
                      </motion.div>
                      <h3 className="text-lg font-semibold text-taskflux-slate-navy">Progress Tracking</h3>
                      <p className="text-taskflux-cool-gray text-sm">Monitor your progress and stay on top of deadlines.</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <motion.div whileHover={scaleOnHover} transition={{ type: "spring", stiffness: 300 }}>
                  <Card className="group relative bg-taskflux-surface border border-taskflux-light-gray/70 shadow-sm transition-all duration-300 h-full overflow-hidden">
                    <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-taskflux-red via-rose-500 to-taskflux-red opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <CardContent className="p-6 text-center space-y-4">
                      <motion.div 
                        className="w-12 h-12 bg-taskflux-red/10 rounded-lg flex items-center justify-center mx-auto"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <Zap className="h-6 w-6 text-taskflux-red" />
                      </motion.div>
                      <h3 className="text-lg font-semibold text-taskflux-slate-navy">Smart Automation</h3>
                      <p className="text-taskflux-cool-gray text-sm">Automate repetitive tasks and boost productivity.</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="relative bg-taskflux-surface py-24 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-taskflux-sky-blue/10 via-white to-taskflux-emerald/10" />
          <div className="pointer-events-none absolute -top-16 left-12 h-48 w-48 rounded-full bg-taskflux-sky-blue/15 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-14 h-56 w-56 rounded-full bg-taskflux-emerald/15 blur-3xl" />
          <div className="relative max-w-7xl mx-auto px-4 lg:px-6">
            <motion.div 
              className="text-center space-y-4 mb-16"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-taskflux-sky-blue/10 px-4 py-2 text-sm font-medium text-taskflux-sky-blue">
                <Sparkles className="h-4 w-4" />
                Workflow Intelligence
              </div>
              <h2 className="text-3xl font-semibold text-taskflux-slate-navy">
                How teams ship with TaskFlux
              </h2>
              <p className="text-lg text-taskflux-cool-gray max-w-2xl mx-auto">
                Follow a proven playbook that balances clarity, execution, and optimisation for every project stage.
              </p>
            </motion.div>

            <motion.div 
              className="relative"
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, amount: 0.3 }}
            >
              <div className="pointer-events-none absolute hidden md:block left-4 right-4 top-1/2 h-px bg-gradient-to-r from-transparent via-taskflux-light-gray/70 to-transparent" />
              <div className="grid gap-10 md:grid-cols-3 relative z-10">
                {howItWorksSteps.map((step, index) => (
                  <motion.div key={step.title} variants={fadeInUp}>
                    <Card className="group relative overflow-hidden border border-taskflux-light-gray/70 bg-taskflux-surface/95 shadow-lg backdrop-blur">
                      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${step.accent}`} />
                      <CardContent className="space-y-5 p-6">
                        <div className="flex items-center justify-between">
                          <span className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold ${step.numberBg} ${step.numberText}`}>
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="text-xs font-semibold uppercase tracking-[0.35em] text-taskflux-cool-gray/80">
                            {step.badge}
                          </span>
                        </div>
                        <h3 className="text-xl font-semibold text-taskflux-slate-navy transition-colors duration-200 group-hover:text-taskflux-sky-blue">
                          {step.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-taskflux-cool-gray">
                          {step.description}
                        </p>
                        <ul className="space-y-2.5">
                          {step.points.map((point) => (
                            <li key={point} className="flex items-start gap-3 text-sm text-taskflux-cool-gray">
                              <span className={`mt-1 h-2 w-2 rounded-full ${step.dot}`} />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Final CTA Section */}
        <motion.section 
          className="relative py-24 overflow-hidden"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-taskflux-sky-blue via-blue-600 to-taskflux-blue-hover" />
          <div
            className="pointer-events-none absolute inset-0 opacity-35"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="pointer-events-none absolute -top-24 left-10 h-56 w-56 rounded-full bg-white/30 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-purple-400/40 blur-3xl" />

          <div className="relative max-w-6xl mx-auto px-4 lg:px-6">
            <Card className="relative overflow-hidden border border-white/15 bg-white/10 text-white shadow-2xl backdrop-blur-lg">
              <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-white via-white/60 to-transparent" />
              <div className="absolute -top-16 -right-10 h-52 w-52 rounded-full bg-white/20 blur-3xl" />
              <CardContent className="relative grid gap-10 p-8 sm:p-10 md:grid-cols-[2fr_1fr]">
                <div className="space-y-6">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
                    <Sparkles className="h-4 w-4" />
                    NEXT STEP
                  </span>
                  <h2 className="text-3xl font-bold leading-snug md:text-4xl">
                    Build a calmer, faster workflow with TaskFlux.
                  </h2>
                  <p className="text-lg text-blue-100/90">
                    Get going in minutes with guided onboarding, automation recipes, and tailor-made dashboards for product, marketing, and ops teams.
                  </p>
                  <div className="grid gap-3 text-left text-sm text-blue-100/90 sm:grid-cols-2">
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-white/80" />
                      Unlimited projects on the 14-day trial
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-white/80" />
                      Automation templates for recurring work
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-white/80" />
                      Priority support from day one
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-white/80" />
                      Reports stakeholders actually read
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Link href="/register">
                      <motion.div
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <Button className="bg-white text-blue-400 hover:bg-blue-50 px-10 py-3 rounded-full shadow-xl shadow-taskflux-sky-blue/30 transition-all duration-200 text-lg font-semibold">
                          Start Free Trial
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </motion.div>
                    </Link>
                    <motion.div
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Button
                        variant="outline"
                        className="border-white/60 bg-white/10 text-white hover:bg-white/20 px-8 py-3 rounded-full transition-all duration-200"
                      >
                        Talk to us
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </motion.div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-inner">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                      Teams shipping faster
                    </p>
                    <p className="mt-3 text-4xl font-bold">+42%</p>
                    <p className="text-sm text-white/75">
                      Average lift in delivery velocity reported after 60 days on TaskFlux.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-inner space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                      What you unlock
                    </p>
                    <ul className="space-y-2 text-sm text-blue-100/90">
                      <li className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-white/80" />
                        AI-powered summaries and insights
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-white/80" />
                        Unlimited viewers for stakeholders
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-white/80" />
                        SOC2-ready audit trails
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <motion.footer 
        className="relative overflow-hidden bg-taskflux-pale-gray pt-16 pb-10 text-taskflux-slate-navy"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-taskflux-sky-blue/40 to-transparent" />
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_55%)]" />
  <div className="pointer-events-none absolute bottom-[-120px] right-[-80px] h-80 w-80 rounded-full bg-taskflux-sky-blue/15 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-6">
          <motion.div 
            className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <motion.div 
              className="space-y-6"
              variants={fadeInUp}
            >
              <div className="flex items-center gap-3">
                <Image src="/taskflux-logo.png" alt="TaskFlux logo" width={100} height={80} className="rounded-2xl" />
                {/* <span className="text-2xl font-semibold">TaskFlux</span> */}
              </div>
              <p className="text-sm text-taskflux-slate-navy/70">
                Plan, execute, and optimise ambitious projects with a workspace built for clarity and momentum.
              </p>
              <div className="flex flex-col gap-3 text-sm text-taskflux-slate-navy/70">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <a className="hover:text-taskflux-sky-blue transition-colors" href="mailto:hello@taskflux.app">
                    hello@taskflux.app
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <motion.a
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-taskflux-slate-navy/20 bg-taskflux-sky-blue/10 text-taskflux-slate-navy/80 transition-colors hover:text-taskflux-sky-blue"
                    href="#"
                  >
                    <Linkedin className="h-4 w-4" />
                  </motion.a>
                  <motion.a
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-taskflux-slate-navy/20 bg-taskflux-sky-blue/10 text-taskflux-slate-navy/80 transition-colors hover:text-taskflux-sky-blue"
                    href="#"
                  >
                    <Twitter className="h-4 w-4" />
                  </motion.a>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className="space-y-4"
              variants={fadeInUp}
            >
              <h4 className="font-semibold text-taskflux-slate-navy">Product</h4>
              <ul className="space-y-2 text-sm text-taskflux-slate-navy/70">
                <li><a href="#" className="hover:text-taskflux-sky-blue transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-taskflux-sky-blue transition-colors">Templates</a></li>
                <li><a href="#" className="hover:text-taskflux-sky-blue transition-colors">Automation</a></li>
                <li><a href="#" className="hover:text-taskflux-sky-blue transition-colors">Changelog</a></li>
              </ul>
            </motion.div>
            
            <motion.div 
              className="space-y-4"
              variants={fadeInUp}
            >
              <h4 className="font-semibold text-taskflux-slate-navy">Resources</h4>
              <ul className="space-y-2 text-sm text-taskflux-slate-navy/70">
                <li><a href="#" className="hover:text-taskflux-sky-blue transition-colors">Docs & API</a></li>
                <li><a href="#" className="hover:text-taskflux-sky-blue transition-colors">Guides</a></li>
                <li><a href="#" className="hover:text-taskflux-sky-blue transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-taskflux-sky-blue transition-colors">Status</a></li>
              </ul>
            </motion.div>
            
            <motion.div 
              className="space-y-4"
              variants={fadeInUp}
            >
              <h4 className="font-semibold text-taskflux-slate-navy">Company</h4>
              <ul className="space-y-2 text-sm text-taskflux-slate-navy/70">
                <li><a href="#" className="hover:text-taskflux-sky-blue transition-colors">About</a></li>
                <li><a href="#" className="hover:text-taskflux-sky-blue transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-taskflux-sky-blue transition-colors">Press</a></li>
                <li><a href="#" className="hover:text-taskflux-sky-blue transition-colors">Legal</a></li>
              </ul>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="mt-12 flex flex-col gap-4 border-t border-taskflux-slate-navy/10 pt-6 text-sm text-taskflux-slate-navy/60 md:flex-row md:items-center md:justify-between"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <span>© 2025 TaskFlux. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-taskflux-sky-blue transition-colors">Privacy</a>
              <a href="#" className="hover:text-taskflux-sky-blue transition-colors">Terms</a>
              <a href="#" className="hover:text-taskflux-sky-blue transition-colors">Security</a>
            </div>
          </motion.div>
        </div>
      </motion.footer>
    </div>
  );
}
