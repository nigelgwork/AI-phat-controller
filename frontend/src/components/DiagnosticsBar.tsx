import { useQuery } from '@tanstack/react-query';
import { Cpu, HardDrive, Clock, Zap } from 'lucide-react';
import { api } from '@/api';

interface SystemMetrics {
  system: {
    cpuPercent: number;
    cpuCores: number;
    memTotal: number;
    memUsed: number;
    memPercent: number;
  };
  app: {
    memRss: number;
    memHeapUsed: number;
    memHeapTotal: number;
    uptime: number;
  };
}

interface ClaudeUsage {
  subscription: string;
  rateLimitTier: string;
  today: { tokens: number; messages: number };
  week: { tokens: number };
  modelBreakdown: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }>;
  lastUpdated: string;
  projects: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

function formatTokens(count: number): string {
  if (count < 1000) return String(count);
  if (count < 1_000_000) return `${(count / 1000).toFixed(1)}k`;
  return `${(count / 1_000_000).toFixed(1)}M`;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function getSessionResetTime(): string {
  const now = new Date();
  // Claude session limits reset every 5 hours
  const periodMs = 5 * 60 * 60 * 1000;
  const msIntoCurrentPeriod = now.getTime() % periodMs;
  const msRemaining = periodMs - msIntoCurrentPeriod;
  const minsRemaining = Math.floor(msRemaining / 60000);
  if (minsRemaining < 60) return `${minsRemaining} min`;
  const hrs = Math.floor(minsRemaining / 60);
  const mins = minsRemaining % 60;
  return `${hrs}h ${mins}m`;
}

function getWeeklyResetTime(): string {
  const now = new Date();
  // Weekly limits reset on a weekly cadence
  const dayOfWeek = now.getDay(); // 0=Sun
  const daysUntilReset = (7 - dayOfWeek) % 7 || 7;
  if (daysUntilReset === 1) return 'tomorrow';
  if (daysUntilReset <= 2) return `${daysUntilReset} days`;
  const resetDate = new Date(now.getTime() + daysUntilReset * 86400000);
  return resetDate.toLocaleDateString([], { weekday: 'short' });
}

function subscriptionLabel(sub: string): string {
  if (sub === 'max') return 'Max';
  if (sub === 'pro') return 'Pro';
  if (sub === 'team') return 'Team';
  return sub;
}

export default function DiagnosticsBar() {
  const { data: metrics } = useQuery<SystemMetrics>({
    queryKey: ['system-metrics'],
    queryFn: () => api.getSystemMetrics(),
    refetchInterval: 5000,
  });

  const { data: usage } = useQuery<ClaudeUsage>({
    queryKey: ['claude-usage'],
    queryFn: () => api.getClaudeUsage(),
    refetchInterval: 60000, // Update every minute
  });

  return (
    <footer className="h-7 bg-slate-800 border-t border-slate-700 flex items-center justify-between px-4 text-[11px] text-slate-500 flex-shrink-0 font-mono">
      <div className="flex items-center gap-4">
        {metrics && (
          <>
            <span className="flex items-center gap-1" title={`${metrics.system.cpuCores} cores`}>
              <Cpu size={11} />
              CPU: {metrics.system.cpuPercent}%
            </span>
            <span className="flex items-center gap-1" title={`${formatBytes(metrics.system.memUsed)} / ${formatBytes(metrics.system.memTotal)}`}>
              <HardDrive size={11} />
              RAM: {metrics.system.memPercent}%
            </span>
            <span className="text-slate-600">|</span>
            <span title="Server process memory">
              App: {formatBytes(metrics.app.memRss)}
            </span>
            <span className="flex items-center gap-1" title="Server uptime">
              <Clock size={11} />
              {formatUptime(metrics.app.uptime)}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        {usage && (
          <>
            {usage.subscription !== 'unknown' && (
              <>
                <span className="text-slate-400">
                  Claude {subscriptionLabel(usage.subscription)}
                </span>
                <span className="text-slate-600">|</span>
              </>
            )}
            <span
              className="flex items-center gap-1"
              title={`Today: ${formatTokens(usage.today.tokens)} tokens, ${usage.today.messages} messages\nResets ${getSessionResetTime()}`}
            >
              <Zap size={11} />
              Session: {formatTokens(usage.today.tokens)} tokens
              <span className="text-slate-600">resets {getSessionResetTime()}</span>
            </span>
            <span className="text-slate-600">|</span>
            <span
              className="flex items-center gap-1"
              title={`This week: ${formatTokens(usage.week.tokens)} tokens\nResets ${getWeeklyResetTime()}`}
            >
              Weekly: {formatTokens(usage.week.tokens)} tokens
              <span className="text-slate-600">resets {getWeeklyResetTime()}</span>
            </span>
          </>
        )}
      </div>
    </footer>
  );
}
