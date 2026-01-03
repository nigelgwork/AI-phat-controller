"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  Mail,
  Inbox,
  Send,
  Megaphone,
  RefreshCw,
  Plus,
  Check,
  Circle,
} from "lucide-react";
import { Mail as MailType, Agent } from "@/types/gastown";
import { cn, formatRelativeTime } from "@/lib/utils";

async function fetchInbox(agent: string) {
  const res = await fetch(`/api/mail?agent=${agent}`);
  return res.json();
}

async function fetchAnnounces() {
  const res = await fetch("/api/mail?announces=true");
  return res.json();
}

async function fetchAgents() {
  const res = await fetch("/api/agents");
  return res.json();
}

export default function MailPage() {
  const searchParams = useSearchParams();
  const agentFromUrl = searchParams.get("agent");
  const [selectedAgent, setSelectedAgent] = useState(agentFromUrl || "gt-mayor");
  const [view, setView] = useState<"inbox" | "announces">("inbox");

  // Update selected agent when URL param changes
  useEffect(() => {
    if (agentFromUrl) {
      setSelectedAgent(agentFromUrl);
    }
  }, [agentFromUrl]);

  const { data: inboxData, isLoading: loadingInbox } = useQuery({
    queryKey: ["mail", "inbox", selectedAgent],
    queryFn: () => fetchInbox(selectedAgent),
    enabled: view === "inbox",
  });

  const { data: announcesData, isLoading: loadingAnnounces } = useQuery({
    queryKey: ["mail", "announces"],
    queryFn: fetchAnnounces,
    enabled: view === "announces",
  });

  const { data: agentsData } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
    refetchInterval: 10000,
  });

  const messages: MailType[] =
    view === "inbox"
      ? inboxData?.messages || []
      : announcesData?.messages || [];

  const isLoading = view === "inbox" ? loadingInbox : loadingAnnounces;
  const mailAvailable = view === "inbox" ? inboxData?.available : announcesData?.available;

  const agents: Agent[] = agentsData?.agents || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Mail Center</h1>
          <p className="text-sm text-zinc-400">
            Agent communication and announcements
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Compose
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 space-y-4">
          {/* View Toggle */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2">
            <button
              onClick={() => setView("inbox")}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                view === "inbox"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-100"
              )}
            >
              <Inbox className="h-4 w-4" />
              Inbox
            </button>
            <button
              onClick={() => setView("announces")}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                view === "announces"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-100"
              )}
            >
              <Megaphone className="h-4 w-4" />
              Announcements
            </button>
          </div>

          {/* Agent Selector (only for inbox) */}
          {view === "inbox" && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2">
              <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Agent
              </p>
              {agents.length === 0 ? (
                <p className="px-3 py-2 text-xs text-zinc-500">No agents available</p>
              ) : (
                agents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                      selectedAgent === agent.id
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-400 hover:text-zinc-100"
                    )}
                  >
                    <Mail className="h-4 w-4" />
                    {agent.id}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Mail List */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-12 text-center">
              <Mail className="mx-auto h-12 w-12 text-zinc-600" />
              <h3 className="mt-4 text-lg font-medium text-zinc-300">
                {mailAvailable === false ? "Mail not configured" : "No messages"}
              </h3>
              <p className="mt-2 text-sm text-zinc-500">
                {mailAvailable === false
                  ? "Mail will appear here when agents communicate via gt mail."
                  : view === "inbox"
                  ? `${selectedAgent}'s inbox is empty.`
                  : "No announcements yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((mail) => (
                <div
                  key={mail.id}
                  className={cn(
                    "cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700",
                    !mail.read && "border-l-2 border-l-blue-500"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-1 h-2 w-2 rounded-full",
                          mail.read ? "bg-zinc-600" : "bg-blue-500"
                        )}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-100">
                            {mail.from}
                          </span>
                          <span className="text-xs text-zinc-500">→</span>
                          <span className="text-sm text-zinc-400">
                            {mail.to}
                          </span>
                        </div>
                        <h3 className="mt-1 font-medium text-zinc-200">
                          {mail.subject}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                          {mail.body}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {formatRelativeTime(mail.sent_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
