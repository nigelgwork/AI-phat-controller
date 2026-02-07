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

interface UsageLimitConfig {
  maxTokensPerHour: number;
  maxTokensPerDay: number;
  warningThreshold: number;
  pauseThreshold: number;
  autoResumeOnReset: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function getResetTime(type: 'hourly' | 'daily'): string {
  const now = new Date();
  if (type === 'hourly') {
    const minsLeft = 60 - now.getMinutes();
    return `${minsLeft} min`;
  }
  const nextReset = new Date(now);
  nextReset.setDate(nextReset.getDate() + 1);
  nextReset.setHours(0, 0, 0, 0);
  const hoursLeft = Math.ceil((nextReset.getTime() - now.getTime()) / 3600000);
  if (hoursLeft <= 1) return '<1 hr';
  return `${hoursLeft} hrs`;
}

function usageColor(percent: number): string {
  if (percent >= 80) return 'text-red-400';
  if (percent >= 60) return 'text-yellow-400';
  return 'text-green-400';
}

export default function DiagnosticsBar() {
  const { data: metrics } = useQuery<SystemMetrics>({
    queryKey: ['system-metrics'],
    queryFn: () => api.getSystemMetrics(),
    refetchInterval: 5000,
  });

  const { data: usagePercent } = useQuery<{ hourly: number; daily: number }>({
    queryKey: ['usage-percentages-bar'],
    queryFn: () => api.getUsagePercentages(),
    refetchInterval: 10000,
  });

  const { data: limitConfig } = useQuery<UsageLimitConfig>({
    queryKey: ['usage-limit-config-bar'],
    queryFn: () => api.getUsageLimitConfig(),
    staleTime: 60000,
  });

  const hourly = usagePercent?.hourly ?? 0;
  const daily = usagePercent?.daily ?? 0;

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
        {/* Hourly usage */}
        <span
          className="flex items-center gap-1"
          title={`Hourly limit: ${limitConfig ? `${(limitConfig.maxTokensPerHour / 1000).toFixed(0)}K tokens` : '...'}`}
        >
          <Zap size={11} />
          Session:
          <span className={usageColor(hourly)}>{hourly}%</span>
          <span className="text-slate-600">resets {getResetTime('hourly')}</span>
        </span>
        <span className="text-slate-600">|</span>
        {/* Daily usage */}
        <span
          className="flex items-center gap-1"
          title={`Daily limit: ${limitConfig ? `${(limitConfig.maxTokensPerDay / 1000).toFixed(0)}K tokens` : '...'}`}
        >
          Weekly:
          <span className={usageColor(daily)}>{daily}%</span>
          <span className="text-slate-600">resets {getResetTime('daily')}</span>
        </span>
      </div>
    </footer>
  );
}
