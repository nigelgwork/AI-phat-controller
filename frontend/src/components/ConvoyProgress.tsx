import { useMemo } from 'react';
import { Package, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';

export interface ConvoyBead {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
}

export interface Convoy {
  id: string;
  name: string;
  description?: string;
  beads: ConvoyBead[];
  createdAt: string;
  updatedAt?: string;
}

interface ConvoyProgressProps {
  convoy: Convoy;
  onBeadClick?: (beadId: string) => void;
}

export default function ConvoyProgress({ convoy, onBeadClick }: ConvoyProgressProps) {
  const stats = useMemo(() => {
    const total = convoy.beads.length;
    const completed = convoy.beads.filter(b => b.status === 'completed').length;
    const inProgress = convoy.beads.filter(b => b.status === 'in_progress').length;
    const blocked = convoy.beads.filter(b => b.status === 'blocked').length;
    const pending = convoy.beads.filter(b => b.status === 'pending').length;

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate estimated completion based on velocity
    let estimatedCompletion: string | null = null;
    if (total > 0 && completed > 0 && completed < total) {
      const createdDate = new Date(convoy.createdAt);
      const now = new Date();
      const daysSinceStart = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      const velocity = completed / daysSinceStart; // beads per day

      if (velocity > 0) {
        const remaining = total - completed;
        const daysToComplete = remaining / velocity;
        const completionDate = new Date(now.getTime() + daysToComplete * 24 * 60 * 60 * 1000);
        estimatedCompletion = completionDate.toLocaleDateString();
      }
    }

    return { total, completed, inProgress, blocked, pending, percentage, estimatedCompletion };
  }, [convoy]);

  const getStatusColor = (status: ConvoyBead['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-cyan-500';
      case 'blocked':
        return 'bg-red-500';
      default:
        return 'bg-slate-600';
    }
  };

  const getStatusIcon = (status: ConvoyBead['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={14} className="text-green-400" />;
      case 'in_progress':
        return <Clock size={14} className="text-cyan-400" />;
      case 'blocked':
        return <AlertCircle size={14} className="text-red-400" />;
      default:
        return <Clock size={14} className="text-slate-500" />;
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-cyan-400" />
            <h3 className="font-semibold text-white">{convoy.name}</h3>
          </div>
          <span className="text-2xl font-bold text-white">{stats.percentage}%</span>
        </div>

        {convoy.description && (
          <p className="text-sm text-slate-400 mb-3">{convoy.description}</p>
        )}

        {/* Progress Bar */}
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-green-500 transition-all duration-500"
            style={{ width: `${stats.percentage}%` }}
          />
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-slate-400">{stats.completed} completed</span>
          </div>
          {stats.inProgress > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-cyan-500" />
              <span className="text-slate-400">{stats.inProgress} in progress</span>
            </div>
          )}
          {stats.blocked > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-slate-400">{stats.blocked} blocked</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-600" />
            <span className="text-slate-400">{stats.pending} pending</span>
          </div>
        </div>

        {/* Estimated Completion */}
        {stats.estimatedCompletion && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
            <TrendingUp size={12} />
            <span>Est. completion: {stats.estimatedCompletion}</span>
          </div>
        )}
      </div>

      {/* Beads List */}
      <div className="divide-y divide-slate-700">
        {convoy.beads.map((bead) => (
          <div
            key={bead.id}
            onClick={() => onBeadClick?.(bead.id)}
            className={`flex items-center gap-3 px-4 py-2 hover:bg-slate-750 transition-colors ${onBeadClick ? 'cursor-pointer' : ''}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(bead.status)}`} />
            {getStatusIcon(bead.status)}
            <span className={`text-sm flex-1 ${bead.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
              {bead.title}
            </span>
          </div>
        ))}
      </div>

      {/* Segment Progress Visualization */}
      {convoy.beads.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-700 bg-slate-850">
          <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
            {convoy.beads.map((bead) => (
              <div
                key={bead.id}
                className={`flex-1 ${getStatusColor(bead.status)} transition-colors`}
                title={bead.title}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// List wrapper component for multiple convoys
interface ConvoyListProps {
  convoys: Convoy[];
  onConvoyClick?: (convoyId: string) => void;
  onBeadClick?: (convoyId: string, beadId: string) => void;
}

export function ConvoyList({ convoys, onConvoyClick: _onConvoyClick, onBeadClick }: ConvoyListProps) {
  if (convoys.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No convoys found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {convoys.map((convoy) => (
        <ConvoyProgress
          key={convoy.id}
          convoy={convoy}
          onBeadClick={(beadId) => onBeadClick?.(convoy.id, beadId)}
        />
      ))}
    </div>
  );
}
