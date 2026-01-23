import { useQuery } from '@tanstack/react-query';
import { Users, Bot, Eye, Factory, Zap, Terminal, ArrowRight, Crown } from 'lucide-react';

export default function Agents() {
  const { data: result, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const result = await window.electronAPI?.executeGt(['status', '--json']);
      if (result?.success && result.response) {
        try {
          return JSON.parse(result.response);
        } catch {
          return null;
        }
      }
      return null;
    },
    refetchInterval: 10000,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Agents</h2>

      {isLoading ? (
        <div className="text-slate-400">Loading agents...</div>
      ) : !result ? (
        <EmptyState />
      ) : (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <pre className="text-sm text-slate-300 whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  const agentTypes = [
    {
      icon: Crown,
      name: 'Mayor',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/20',
      description: 'The coordinator. Assigns beads to workers, monitors progress, and handles cross-project decisions.',
    },
    {
      icon: Zap,
      name: 'Polecat',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/20',
      description: 'Ephemeral workers. Spawn to complete a bead, create a PR, then disappear. Your AI coding agents.',
    },
    {
      icon: Eye,
      name: 'Witness',
      color: 'text-purple-400',
      bg: 'bg-purple-500/20',
      description: 'Monitors each project (rig). Watches for completed work and reports status.',
    },
    {
      icon: Factory,
      name: 'Refinery',
      color: 'text-orange-400',
      bg: 'bg-orange-500/20',
      description: 'The merge queue. Reviews PRs, runs tests, and merges approved work.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* What are Agents */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-cyan-500/20 rounded-lg">
            <Users className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">What are Agents?</h3>
            <p className="text-slate-400">
              Agents are <strong className="text-white">autonomous AI workers</strong> powered by Claude Code.
              They work together to process your beads (work items), creating branches, writing code,
              and submitting pull requests — all without manual intervention.
            </p>
          </div>
        </div>
      </div>

      {/* Agent Types */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Bot className="w-5 h-5 text-cyan-400" />
          Agent Types
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {agentTypes.map((agent) => (
            <div key={agent.name} className="bg-slate-900 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${agent.bg}`}>
                  <agent.icon className={`w-5 h-5 ${agent.color}`} />
                </div>
                <span className={`font-semibold ${agent.color}`}>{agent.name}</span>
              </div>
              <p className="text-sm text-slate-400">{agent.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works with Claude Code */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-cyan-400" />
          How Agents Use Claude Code
        </h3>
        <div className="space-y-4 text-slate-400">
          <p>
            Each agent runs a Claude Code session with specific tools and permissions:
          </p>
          <div className="bg-slate-900 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <ArrowRight size={16} className="text-cyan-400 mt-1" />
              <div>
                <span className="text-white font-medium">Polecat picks a bead</span>
                <span className="text-slate-500"> → Creates branch → Writes code → Commits → Opens PR</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ArrowRight size={16} className="text-cyan-400 mt-1" />
              <div>
                <span className="text-white font-medium">Witness monitors</span>
                <span className="text-slate-500"> → Reports progress → Updates bead status</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ArrowRight size={16} className="text-cyan-400 mt-1" />
              <div>
                <span className="text-white font-medium">Refinery reviews</span>
                <span className="text-slate-500"> → Runs tests → Merges approved PRs</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-gradient-to-br from-cyan-500/10 to-slate-800 rounded-lg p-6 border border-cyan-500/30">
        <h3 className="text-lg font-semibold text-white mb-4">Start the Agent System</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-sm font-bold">1</div>
            <div>
              <p className="text-white font-medium">Set up Gas Town workspace first</p>
              <code className="text-sm text-cyan-400 bg-slate-900 px-2 py-1 rounded block mt-1">
                gt install ~/gt
              </code>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-sm font-bold">2</div>
            <div>
              <p className="text-white font-medium">Add your git repos to Gas Town</p>
              <code className="text-sm text-cyan-400 bg-slate-900 px-2 py-1 rounded block mt-1">
                gt rig add myproject https://github.com/you/repo.git
              </code>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-sm font-bold">3</div>
            <div>
              <p className="text-white font-medium">Start the Mayor (orchestrator)</p>
              <code className="text-sm text-cyan-400 bg-slate-900 px-2 py-1 rounded block mt-1">
                gt prime
              </code>
              <p className="text-sm text-slate-400 mt-1">
                This starts the agent system. The Mayor will spawn Polecats to work on beads.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Status */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-center">
        <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <p className="text-slate-400">No agents currently running</p>
        <p className="text-sm text-slate-500 mt-2">
          Start the agent system with <code className="text-cyan-400">gt prime</code> in your terminal
        </p>
      </div>
    </div>
  );
}
