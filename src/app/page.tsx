"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  CircleDot,
  Truck,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";
import { StatCard, ProgressBar, StatusBadge } from "@/components/ui";
import { Agent, Convoy, TownEvent } from "@/types/gastown";

async function fetchBeadsStats() {
  const res = await fetch("/api/beads?stats=true");
  return res.json();
}

async function fetchAgents() {
  const res = await fetch("/api/agents");
  return res.json();
}

async function fetchConvoys() {
  const res = await fetch("/api/convoys");
  return res.json();
}

async function fetchEvents() {
  const res = await fetch("/api/beads?events=true&limit=5");
  return res.json();
}

export default function HomePage() {
  const { data: beadsData } = useQuery({
    queryKey: ["beads-stats"],
    queryFn: fetchBeadsStats,
    refetchInterval: 5000,
  });

  const { data: agentsData } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
    refetchInterval: 5000,
  });

  const { data: convoysData } = useQuery({
    queryKey: ["convoys"],
    queryFn: fetchConvoys,
    refetchInterval: 5000,
  });

  const { data: eventsData } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
    refetchInterval: 5000,
  });

  const stats = beadsData?.stats || {
    total: 0,
    open: 0,
    in_progress: 0,
    blocked: 0,
    actionable: 0,
  };

  const agents: Agent[] = agentsData?.agents || [];
  const convoys: Convoy[] = convoysData?.convoys || [];
  const recentEvents: TownEvent[] = eventsData?.events || [];

  const activeAgents = agents.filter((a) => a.status === "working").length;
  const activeConvoys = convoys.filter((c) => c.status === "active").length;

  // Calculate system health based on blocked items and data availability
  const hasData = stats.total > 0 || recentEvents.length > 0;
  const blockedRatio = stats.total > 0 ? stats.blocked / stats.total : 0;
  const healthPercent = hasData ? Math.round((1 - blockedRatio) * 100) : 0;
  const healthStatus = !hasData ? "No data" : healthPercent > 90 ? "All systems operational" : healthPercent > 70 ? "Minor issues" : "Attention needed";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            Gas Town Control Center
          </h1>
          <p className="text-sm text-zinc-400">
            Multi-agent orchestration dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm text-green-500">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            System Online
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Agents"
          value={activeAgents}
          subtitle={`${agents.length} total`}
          icon={Users}
        />
        <StatCard
          title="Pending Work"
          value={stats.open + stats.in_progress}
          subtitle={`${stats.actionable} actionable`}
          icon={CircleDot}
        />
        <StatCard
          title="Active Convoys"
          value={activeConvoys}
          subtitle={`${convoys.length} total`}
          icon={Truck}
        />
        <StatCard
          title="System Health"
          value={hasData ? `${healthPercent}%` : "—"}
          subtitle={healthStatus}
          icon={Activity}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-zinc-100">
            Work Distribution
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex w-28 items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-zinc-400">Open</span>
              </div>
              <ProgressBar
                value={stats.open}
                max={stats.total || 1}
                showPercentage={false}
                className="flex-1"
              />
              <span className="w-8 text-right text-sm text-zinc-400">
                {stats.open}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex w-28 items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-zinc-400">In Progress</span>
              </div>
              <ProgressBar
                value={stats.in_progress}
                max={stats.total || 1}
                showPercentage={false}
                variant="warning"
                className="flex-1"
              />
              <span className="w-8 text-right text-sm text-zinc-400">
                {stats.in_progress}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex w-28 items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-zinc-400">Blocked</span>
              </div>
              <ProgressBar
                value={stats.blocked}
                max={stats.total || 1}
                showPercentage={false}
                variant="danger"
                className="flex-1"
              />
              <span className="w-8 text-right text-sm text-zinc-400">
                {stats.blocked}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex w-28 items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-zinc-400">Actionable</span>
              </div>
              <ProgressBar
                value={stats.actionable}
                max={stats.total || 1}
                showPercentage={false}
                variant="success"
                className="flex-1"
              />
              <span className="w-8 text-right text-sm text-zinc-400">
                {stats.actionable}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-zinc-100">
            Recent Events
          </h2>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No recent events. Events will appear here when Gas Town is active.
            </p>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((event, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-lg bg-zinc-800/50 p-3"
                >
                  <div className="mt-0.5">
                    {event.type.includes("completed") ||
                    event.type.includes("closed") ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : event.type.includes("stuck") ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Activity className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-zinc-300">{event.message}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">Active Agents</h2>
          <a
            href="/agents"
            className="text-sm text-blue-500 hover:text-blue-400"
          >
            View all →
          </a>
        </div>
        {agents.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No agents currently running. Start the Gas Town daemon to spawn
            agents.
          </p>
        ) : (
          <div className="space-y-3">
            {agents.slice(0, 3).map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between rounded-lg bg-zinc-800/50 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700">
                    <Users className="h-5 w-5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-200">{agent.id}</p>
                    <p className="text-xs text-zinc-500">
                      {agent.role} • {agent.rig || "town"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {agent.context_usage !== undefined && (
                    <div className="w-32">
                      <ProgressBar
                        value={agent.context_usage}
                        label="Context"
                        size="sm"
                        variant={
                          agent.context_usage > 80
                            ? "danger"
                            : agent.context_usage > 60
                            ? "warning"
                            : "default"
                        }
                      />
                    </div>
                  )}
                  <StatusBadge status={agent.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
