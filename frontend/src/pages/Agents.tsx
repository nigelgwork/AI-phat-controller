import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Bot, Eye, Factory, Zap, Terminal, ArrowRight, Crown, RefreshCw, Activity,
  FolderGit, Plus, Trash2, Edit2, Save, X, ChevronRight, Package
} from 'lucide-react';
import type { ClaudeSession, ClaudeAgent, Project } from '../types/electron';

function formatStartTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  } catch {
    return '';
  }
}

const AGENT_COLORS = ['blue', 'green', 'yellow', 'magenta', 'red', 'cyan'] as const;
const AGENT_MODELS = ['inherit', 'sonnet', 'opus', 'haiku'] as const;
const AVAILABLE_TOOLS = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash', 'WebFetch', 'WebSearch', 'Task'] as const;

type TabType = 'sessions' | 'agents';

export default function Agents() {
  const [activeTab, setActiveTab] = useState<TabType>('sessions');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Agents</h2>
        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeTab === 'sessions'
                ? 'bg-cyan-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity size={14} className="inline mr-2" />
            Sessions
          </button>
          <button
            onClick={() => setActiveTab('agents')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeTab === 'agents'
                ? 'bg-cyan-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot size={14} className="inline mr-2" />
            Agent Types
          </button>
        </div>
      </div>

      {activeTab === 'sessions' ? <SessionsTab /> : <AgentsTab />}
    </div>
  );
}

function SessionsTab() {
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

  const { data: sessions, isLoading: isLoadingSessions, refetch: refetchSessions } = useQuery({
    queryKey: ['claude-sessions'],
    queryFn: () => window.electronAPI?.getClaudeSessions() as Promise<ClaudeSession[]>,
    refetchInterval: 5000,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => window.electronAPI?.listProjects() as Promise<Project[]>,
  });

  const claudeProjects = projects?.filter(p => p.hasClaude) || [];
  const hasActiveSessions = sessions && sessions.length > 0;

  return (
    <div className="space-y-6">
      {/* Active Claude Sessions */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Activity size={18} className="text-green-400" />
            Active Claude Code Sessions
            {hasActiveSessions && (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                {sessions.length} running
              </span>
            )}
          </h3>
          <button
            onClick={() => refetchSessions()}
            disabled={isLoadingSessions}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          >
            <RefreshCw size={14} className={isLoadingSessions ? 'animate-spin' : ''} />
          </button>
        </div>

        {isLoadingSessions ? (
          <div className="p-6 text-center text-slate-400">Detecting sessions...</div>
        ) : !hasActiveSessions ? (
          <div className="p-6 text-center">
            <Terminal className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">No active Claude Code sessions detected</p>
            <p className="text-sm text-slate-500 mt-1">
              Start Claude Code in a project to see it here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {sessions.map((session) => (
              <div key={session.pid} className="p-4 hover:bg-slate-700/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        session.status === 'running' ? 'bg-green-400 animate-pulse' : 'bg-slate-400'
                      }`} />
                      <span className="font-medium text-white">
                        {session.projectName || 'Claude Code Session'}
                      </span>
                      <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                        PID: {session.pid}
                      </span>
                      {session.source && (
                        <span className="text-xs bg-slate-600 px-2 py-0.5 rounded text-slate-300">
                          {session.source}
                        </span>
                      )}
                      {session.status && session.status !== 'running' && (
                        <span className="text-xs bg-slate-600 px-2 py-0.5 rounded text-slate-400">
                          {session.status}
                        </span>
                      )}
                      {session.startTime && (
                        <span className="text-xs text-slate-500">
                          Started: {formatStartTime(session.startTime)}
                        </span>
                      )}
                    </div>
                    {session.workingDir && (
                      <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                        <FolderGit size={12} className="flex-shrink-0" />
                        <span className="truncate">{session.workingDir}</span>
                      </p>
                    )}
                    {session.command && (
                      <p className="text-xs text-slate-500 mt-1 font-mono truncate">
                        {session.command}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Claude-Enabled Projects */}
      {claudeProjects.length > 0 && (
        <div className="bg-slate-800 rounded-lg border border-slate-700">
          <div className="p-4 border-b border-slate-700">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Bot size={18} className="text-purple-400" />
              Claude-Enabled Projects
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                {claudeProjects.length} with CLAUDE.md
              </span>
            </h3>
          </div>
          <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {claudeProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <div className="p-2 bg-purple-500/20 rounded">
                  <FolderGit size={16} className="text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{project.name}</div>
                  <div className="text-xs text-slate-400 truncate">{project.path}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gas Town Agents */}
      {isLoading ? (
        <div className="text-slate-400">Loading Gas Town agents...</div>
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

function AgentsTab() {
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<ClaudeAgent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { data: agents, isLoading: isLoadingAgents, refetch: refetchAgents } = useQuery({
    queryKey: ['claude-agents'],
    queryFn: () => window.electronAPI?.listAgents() as Promise<ClaudeAgent[]>,
  });


  const createMutation = useMutation({
    mutationFn: (agent: Partial<ClaudeAgent>) => window.electronAPI!.createAgent(agent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claude-agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent-plugins'] });
      setIsCreating(false);
      setSelectedAgent(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ClaudeAgent> }) =>
      window.electronAPI!.updateAgent(id, updates),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['claude-agents'] });
      setSelectedAgent(updated);
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => window.electronAPI!.deleteAgent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claude-agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent-plugins'] });
      setSelectedAgent(null);
    },
  });

  const agentsByPlugin = agents?.reduce((acc, agent) => {
    if (!acc[agent.pluginName]) acc[agent.pluginName] = [];
    acc[agent.pluginName].push(agent);
    return acc;
  }, {} as Record<string, ClaudeAgent[]>) ?? {};

  const handleCreateNew = () => {
    setSelectedAgent({
      id: '',
      name: '',
      description: '',
      content: '',
      filePath: '',
      pluginName: 'custom-agents',
      isCustom: true,
    } as ClaudeAgent);
    setIsCreating(true);
    setIsEditing(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Agent List */}
      <div className="lg:col-span-1 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Available Agents</h3>
          <div className="flex gap-2">
            <button
              onClick={() => refetchAgents()}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              <RefreshCw size={14} className={isLoadingAgents ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500 text-white rounded text-sm hover:bg-cyan-600 transition-colors"
            >
              <Plus size={14} />
              New
            </button>
          </div>
        </div>

        {isLoadingAgents ? (
          <div className="p-4 text-center text-slate-400">Loading agents...</div>
        ) : !agents?.length ? (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 text-center">
            <Bot className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">No agents found</p>
            <p className="text-sm text-slate-500 mt-1">
              Create a custom agent to get started
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(agentsByPlugin).map(([pluginName, pluginAgents]) => (
              <div key={pluginName} className="bg-slate-800 rounded-lg border border-slate-700">
                <div className="p-3 border-b border-slate-700 flex items-center gap-2">
                  <Package size={14} className="text-slate-400" />
                  <span className="text-sm font-medium text-slate-300">{pluginName}</span>
                  <span className="text-xs text-slate-500">({pluginAgents.length})</span>
                  {pluginName === 'custom-agents' && (
                    <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded ml-auto">
                      Custom
                    </span>
                  )}
                </div>
                <div className="divide-y divide-slate-700">
                  {pluginAgents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setSelectedAgent(agent);
                        setIsEditing(false);
                        setIsCreating(false);
                      }}
                      className={`w-full p-3 text-left hover:bg-slate-700/50 transition-colors flex items-center gap-3 ${
                        selectedAgent?.id === agent.id ? 'bg-slate-700/50' : ''
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full flex-shrink-0`}
                        style={{ backgroundColor: getAgentColor(agent.color) }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{agent.name}</div>
                        <div className="text-xs text-slate-400 truncate">{agent.description}</div>
                      </div>
                      <ChevronRight size={14} className="text-slate-500" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agent Detail / Editor */}
      <div className="lg:col-span-2">
        {selectedAgent ? (
          <AgentEditor
            agent={selectedAgent}
            isEditing={isEditing}
            isCreating={isCreating}
            onEdit={() => setIsEditing(true)}
            onCancel={() => {
              if (isCreating) {
                setSelectedAgent(null);
                setIsCreating(false);
              }
              setIsEditing(false);
            }}
            onSave={(updates) => {
              if (isCreating) {
                createMutation.mutate(updates);
              } else {
                updateMutation.mutate({ id: selectedAgent.id, updates });
              }
            }}
            onDelete={() => {
              if (selectedAgent.isCustom && !isCreating) {
                deleteMutation.mutate(selectedAgent.id);
              }
            }}
            isSaving={createMutation.isPending || updateMutation.isPending}
            isDeleting={deleteMutation.isPending}
          />
        ) : (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 text-center">
            <Bot className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">Select an agent to view details</p>
            <p className="text-sm text-slate-500 mt-2">
              or create a new custom agent
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface AgentEditorProps {
  agent: ClaudeAgent;
  isEditing: boolean;
  isCreating: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (updates: Partial<ClaudeAgent>) => void;
  onDelete: () => void;
  isSaving: boolean;
  isDeleting: boolean;
}

function AgentEditor({ agent, isEditing, isCreating, onEdit, onCancel, onSave, onDelete, isSaving, isDeleting }: AgentEditorProps) {
  const [formData, setFormData] = useState<Partial<ClaudeAgent>>({
    name: agent.name,
    description: agent.description,
    model: agent.model,
    color: agent.color,
    tools: agent.tools || [],
    content: agent.content,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const toggleTool = (tool: string) => {
    const tools = formData.tools || [];
    if (tools.includes(tool)) {
      setFormData({ ...formData, tools: tools.filter(t => t !== tool) });
    } else {
      setFormData({ ...formData, tools: [...tools, tool] });
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: getAgentColor(isEditing ? formData.color : agent.color) }}
          />
          <h3 className="font-semibold text-white">
            {isCreating ? 'Create New Agent' : agent.name}
          </h3>
          {!isCreating && !agent.isCustom && (
            <span className="text-xs bg-slate-600 px-2 py-0.5 rounded text-slate-300">
              Plugin Agent
            </span>
          )}
          {agent.isCustom && (
            <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">
              Custom
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={onEdit}
                className="flex items-center gap-1 px-3 py-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded text-sm transition-colors"
              >
                <Edit2 size={14} />
                Edit
              </button>
              {agent.isCustom && (
                <button
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-1 px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded text-sm transition-colors"
                >
                  <Trash2 size={14} />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={onCancel}
                className="flex items-center gap-1 px-3 py-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded text-sm transition-colors"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500 text-white rounded text-sm hover:bg-cyan-600 transition-colors disabled:opacity-50"
              >
                <Save size={14} />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              placeholder="agent-name"
              required
            />
          ) : (
            <p className="text-white">{agent.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              placeholder="Use this agent when..."
            />
          ) : (
            <p className="text-slate-400">{agent.description || 'No description'}</p>
          )}
        </div>

        {/* Model & Color */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Model</label>
            {isEditing ? (
              <select
                value={formData.model || 'inherit'}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white focus:outline-none focus:border-cyan-500"
              >
                {AGENT_MODELS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <p className="text-slate-400">{agent.model || 'inherit'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Color</label>
            {isEditing ? (
              <div className="flex gap-2">
                {AGENT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c })}
                    className={`w-8 h-8 rounded border-2 ${formData.color === c ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: getAgentColor(c) }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: getAgentColor(agent.color) }}
                />
                <span className="text-slate-400">{agent.color || 'default'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tools */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Tools</label>
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TOOLS.map((tool) => (
                <button
                  key={tool}
                  type="button"
                  onClick={() => toggleTool(tool)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    formData.tools?.includes(tool)
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {tool}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {agent.tools?.length ? (
                agent.tools.map((tool) => (
                  <span key={tool} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-sm">
                    {tool}
                  </span>
                ))
              ) : (
                <span className="text-slate-500">All tools (default)</span>
              )}
            </div>
          )}
        </div>

        {/* System Prompt */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">System Prompt</label>
          {isEditing ? (
            <textarea
              value={formData.content || ''}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full h-64 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-y"
              placeholder="Enter the system prompt for this agent..."
            />
          ) : (
            <pre className="w-full h-64 overflow-auto p-3 bg-slate-900 border border-slate-700 rounded text-slate-300 font-mono text-sm whitespace-pre-wrap">
              {agent.content || 'No system prompt defined'}
            </pre>
          )}
        </div>

        {/* File Path (read-only) */}
        {!isCreating && agent.filePath && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">File Path</label>
            <p className="text-xs text-slate-500 font-mono truncate">{agent.filePath}</p>
          </div>
        )}

        {/* Warning for plugin agents */}
        {isEditing && !agent.isCustom && !isCreating && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-400 text-sm">
            Warning: This is a plugin agent. Changes may be overwritten when the plugin is updated.
          </div>
        )}
      </form>
    </div>
  );
}

function getAgentColor(color?: string): string {
  const colors: Record<string, string> = {
    blue: '#3b82f6',
    green: '#22c55e',
    yellow: '#eab308',
    magenta: '#d946ef',
    red: '#ef4444',
    cyan: '#06b6d4',
  };
  return colors[color || 'cyan'] || colors.cyan;
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
