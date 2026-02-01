import { useState } from 'react';
import {
  Terminal,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  Clock,
  Layers,
  Link,
  FileText,
  X,
  ExternalLink,
  Edit2,
  Check,
} from 'lucide-react';
import {
  useTmuxAvailable,
  useTmuxSessions,
  useCreateTmuxSession,
  useAttachTmuxSession,
  useKillTmuxSession,
  useTmuxSessionHistory,
  useUpdateTmuxSessionMeta,
  useRenameTmuxSession,
} from '../hooks/useTmux';
import type { TmuxSession } from '../types/electron.d';
import { useQuery } from '@tanstack/react-query';

export default function TmuxSessions() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  // Queries and mutations
  const { data: isAvailable, isLoading: checkingAvailable } = useTmuxAvailable();
  const { data: sessions = [], isLoading: loadingSessions, refetch } = useTmuxSessions();
  const createSession = useCreateTmuxSession();
  const attachSession = useAttachTmuxSession();
  const killSession = useKillTmuxSession();
  const updateMeta = useUpdateTmuxSessionMeta();
  const renameSession = useRenameTmuxSession();

  // Get projects for association dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => window.electronAPI?.listProjects() ?? [],
  });

  // History for selected session
  const { data: historyResult } = useTmuxSessionHistory(
    showHistoryModal ? selectedSession : null
  );

  const handleCreate = async (name: string, projectId?: string) => {
    try {
      await createSession.mutateAsync({ name, projectId });
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleAttach = async (name: string) => {
    try {
      await attachSession.mutateAsync(name);
    } catch (error) {
      console.error('Failed to attach to session:', error);
    }
  };

  const handleKill = async (name: string) => {
    if (!confirm(`Are you sure you want to kill session "${name}"?`)) return;
    try {
      await killSession.mutateAsync(name);
    } catch (error) {
      console.error('Failed to kill session:', error);
    }
  };

  const handleSaveNotes = async (name: string) => {
    try {
      await updateMeta.mutateAsync({ name, updates: { notes: notesValue } });
      setEditingNotes(null);
    } catch (error) {
      console.error('Failed to save notes:', error);
    }
  };

  const handleRename = async (oldName: string) => {
    if (!newName.trim()) return;
    try {
      await renameSession.mutateAsync({ oldName, newName: newName.trim() });
      setRenaming(null);
      setNewName('');
    } catch (error) {
      console.error('Failed to rename session:', error);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  if (checkingAvailable) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!isAvailable) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">tmux Not Available</h2>
        <p className="text-slate-400 max-w-md">
          tmux is not installed or not available in your PATH. Please install tmux to use this
          feature.
        </p>
        <pre className="mt-4 px-4 py-2 bg-slate-800 rounded text-sm text-slate-300">
          sudo apt install tmux
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">tmux Sessions</h1>
            <p className="text-sm text-slate-400">Manage your terminal multiplexer sessions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title="Refresh sessions"
          >
            <RefreshCw className={`w-5 h-5 ${loadingSessions ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </div>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 text-center">
          <Terminal className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No tmux Sessions</h3>
          <p className="text-slate-400 mb-4">Create a new session to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Session
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session: TmuxSession) => (
            <div
              key={session.id}
              className="bg-slate-800 rounded-lg border border-slate-700 p-4 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Terminal className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                  {renaming === session.name ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(session.name);
                          if (e.key === 'Escape') setRenaming(null);
                        }}
                      />
                      <button
                        onClick={() => handleRename(session.name)}
                        className="p-1 text-green-400 hover:bg-slate-700 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setRenaming(null)}
                        className="p-1 text-slate-400 hover:bg-slate-700 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-medium text-white truncate">{session.name}</span>
                      <button
                        onClick={() => {
                          setRenaming(session.name);
                          setNewName(session.name);
                        }}
                        className="p-1 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                <span
                  className={`px-2 py-0.5 text-xs rounded ${
                    session.attached
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {session.attached ? 'Attached' : 'Detached'}
                </span>
              </div>

              <div className="space-y-2 text-sm text-slate-400 mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span>{session.windows} window(s)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{formatDate(session.created)}</span>
                </div>
                {session.projectId && (
                  <div className="flex items-center gap-2">
                    <Link className="w-4 h-4" />
                    <span className="truncate">
                      {projects.find((p) => p.id === session.projectId)?.name || session.projectId}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="mb-4">
                {editingNotes === session.name ? (
                  <div className="space-y-2">
                    <textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm resize-none"
                      rows={2}
                      placeholder="Add notes..."
                    />
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditingNotes(null)}
                        className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveNotes(session.name)}
                        className="px-2 py-1 text-xs bg-cyan-600 text-white rounded hover:bg-cyan-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingNotes(session.name);
                      setNotesValue(session.notes || '');
                    }}
                    className="text-sm text-slate-500 hover:text-slate-300 flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    {session.notes ? (
                      <span className="truncate">{session.notes}</span>
                    ) : (
                      <span className="italic">Add notes...</span>
                    )}
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAttach(session.name)}
                  disabled={attachSession.isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 text-white text-sm rounded transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Attach
                </button>
                <button
                  onClick={() => {
                    setSelectedSession(session.name);
                    setShowHistoryModal(true);
                  }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                  title="View history"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleKill(session.name)}
                  disabled={killSession.isPending}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                  title="Kill session"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <CreateSessionModal
          projects={projects}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
          isCreating={createSession.isPending}
        />
      )}

      {/* History Modal */}
      {showHistoryModal && selectedSession && (
        <HistoryModal
          sessionName={selectedSession}
          content={historyResult?.content || ''}
          error={historyResult?.error}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedSession(null);
          }}
        />
      )}
    </div>
  );
}

// Create Session Modal Component
function CreateSessionModal({
  projects,
  onClose,
  onCreate,
  isCreating,
}: {
  projects: { id: string; name: string; path: string }[];
  onClose: () => void;
  onCreate: (name: string, projectId?: string) => void;
  isCreating: boolean;
}) {
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), projectId || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Create tmux Session</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Session Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              placeholder="my-session"
              autoFocus
            />
            <p className="text-xs text-slate-500 mt-1">
              Dots and colons will be replaced with underscores
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Associate with Project (optional)
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="">None</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 text-white rounded-lg transition-colors"
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// History Modal Component
function HistoryModal({
  sessionName,
  content,
  error,
  onClose,
}: {
  sessionName: string;
  content: string;
  error?: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">
            Session History: {sessionName}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {error ? (
            <div className="text-red-400">{error}</div>
          ) : (
            <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap">{content}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
