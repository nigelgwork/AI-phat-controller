import { useState } from 'react';
import { Clock, ChevronDown, ChevronRight, Zap, MessageSquare, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'action' | 'completion' | 'error' | 'approval' | 'message';
  agentName?: string;
  title: string;
  description?: string;
  tokens?: {
    input: number;
    output: number;
  };
  duration?: number;
  status?: 'pending' | 'success' | 'failure';
  details?: string;
}

interface AgentTimelineProps {
  events: TimelineEvent[];
  isLoading?: boolean;
  maxEvents?: number;
}

export default function AgentTimeline({ events, isLoading, maxEvents = 50 }: AgentTimelineProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const toggleExpanded = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const getEventIcon = (event: TimelineEvent) => {
    switch (event.type) {
      case 'action':
        return <Zap size={16} className="text-cyan-400" />;
      case 'completion':
        return event.status === 'success'
          ? <CheckCircle size={16} className="text-green-400" />
          : <XCircle size={16} className="text-red-400" />;
      case 'error':
        return <XCircle size={16} className="text-red-400" />;
      case 'approval':
        return <Clock size={16} className="text-yellow-400" />;
      case 'message':
        return <MessageSquare size={16} className="text-blue-400" />;
      default:
        return <Clock size={16} className="text-slate-400" />;
    }
  };

  const getEventBorderColor = (event: TimelineEvent) => {
    switch (event.type) {
      case 'action':
        return 'border-l-cyan-500';
      case 'completion':
        return event.status === 'success' ? 'border-l-green-500' : 'border-l-red-500';
      case 'error':
        return 'border-l-red-500';
      case 'approval':
        return 'border-l-yellow-500';
      case 'message':
        return 'border-l-blue-500';
      default:
        return 'border-l-slate-500';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  const displayEvents = events.slice(0, maxEvents);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        <span className="ml-2 text-slate-400">Loading timeline...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayEvents.map((event) => (
        <div
          key={event.id}
          className={`bg-slate-800 rounded-lg border border-slate-700 border-l-2 ${getEventBorderColor(event)} overflow-hidden`}
        >
          <div
            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-750"
            onClick={() => event.details && toggleExpanded(event.id)}
          >
            <div className="flex-shrink-0">
              {getEventIcon(event)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white truncate">
                  {event.title}
                </span>
                {event.agentName && (
                  <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">
                    {event.agentName}
                  </span>
                )}
              </div>
              {event.description && (
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {event.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              {event.tokens && (
                <div className="text-xs text-slate-400">
                  <span className="text-green-400">{formatTokens(event.tokens.input)}</span>
                  {' / '}
                  <span className="text-blue-400">{formatTokens(event.tokens.output)}</span>
                </div>
              )}

              {event.duration !== undefined && (
                <span className="text-xs text-slate-500">
                  {formatDuration(event.duration)}
                </span>
              )}

              <span className="text-xs text-slate-500">
                {formatTimestamp(event.timestamp)}
              </span>

              {event.details && (
                <div className="text-slate-500">
                  {expandedEvents.has(event.id) ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </div>
              )}
            </div>
          </div>

          {event.details && expandedEvents.has(event.id) && (
            <div className="px-3 pb-3 pt-1 border-t border-slate-700">
              <pre className="text-xs text-slate-300 bg-slate-900 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                {event.details}
              </pre>
            </div>
          )}
        </div>
      ))}

      {events.length > maxEvents && (
        <div className="text-center text-xs text-slate-500 py-2">
          Showing {maxEvents} of {events.length} events
        </div>
      )}
    </div>
  );
}
