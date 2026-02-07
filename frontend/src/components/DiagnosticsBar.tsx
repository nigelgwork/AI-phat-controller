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

interface TokenTotal {
  input: number;
  output: number;
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

export default function DiagnosticsBar() {
  const { data: metrics } = useQuery<SystemMetrics>({
    queryKey: ['system-metrics'],
    queryFn: () => api.getSystemMetrics(),
    refetchInterval: 5000,
  });

  const { data: tokenTotal } = useQuery<TokenTotal>({
    queryKey: ['token-total'],
    queryFn: () => api.getTokenHistoryTotal(7),
    refetchInterval: 30000,
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
        {tokenTotal && (tokenTotal.input > 0 || tokenTotal.output > 0) && (
          <span className="flex items-center gap-1" title="7-day token usage (input / output)">
            <Zap size={11} />
            Weekly: {formatTokens(tokenTotal.input)} in / {formatTokens(tokenTotal.output)} out
          </span>
        )}
      </div>
    </footer>
  );
}
