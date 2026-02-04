import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';

export interface HourlyUsage {
  hour: number;
  input: number;
  output: number;
}

export interface DailyUsage {
  date: string;
  input: number;
  output: number;
}

interface TokenUsageChartProps {
  hourlyData?: HourlyUsage[];
  dailyData?: DailyUsage[];
  costPerInputToken?: number;
  costPerOutputToken?: number;
}

export default function TokenUsageChart({
  hourlyData = [],
  dailyData = [],
  costPerInputToken = 0.000003, // $3 per 1M input tokens (approximate)
  costPerOutputToken = 0.000015, // $15 per 1M output tokens (approximate)
}: TokenUsageChartProps) {
  // Calculate totals and trends
  const stats = useMemo(() => {
    const totalInput = hourlyData.reduce((sum, h) => sum + h.input, 0);
    const totalOutput = hourlyData.reduce((sum, h) => sum + h.output, 0);

    const todayCost = (totalInput * costPerInputToken) + (totalOutput * costPerOutputToken);

    // Calculate trend from daily data
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (dailyData.length >= 2) {
      const recent = dailyData[dailyData.length - 1];
      const previous = dailyData[dailyData.length - 2];
      const recentTotal = recent.input + recent.output;
      const previousTotal = previous.input + previous.output;

      if (recentTotal > previousTotal * 1.1) trend = 'up';
      else if (recentTotal < previousTotal * 0.9) trend = 'down';
    }

    return { totalInput, totalOutput, todayCost, trend };
  }, [hourlyData, dailyData, costPerInputToken, costPerOutputToken]);

  const maxHourlyValue = useMemo(() => {
    return Math.max(
      ...hourlyData.map(h => h.input + h.output),
      1 // Prevent division by zero
    );
  }, [hourlyData]);

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  const formatCost = (cost: number) => {
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  };

  const TrendIcon = () => {
    switch (stats.trend) {
      case 'up':
        return <TrendingUp size={16} className="text-yellow-400" />;
      case 'down':
        return <TrendingDown size={16} className="text-green-400" />;
      default:
        return <Minus size={16} className="text-slate-400" />;
    }
  };

  // Generate 24-hour labels
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Token Usage</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <TrendIcon />
            <span className="text-xs text-slate-400">Trend</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <DollarSign size={14} className="text-green-400" />
            <span className="text-white font-medium">{formatCost(stats.todayCost)}</span>
            <span className="text-slate-400">today</span>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-900 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Input Tokens</div>
          <div className="text-lg font-semibold text-green-400">
            {formatTokens(stats.totalInput)}
          </div>
        </div>
        <div className="bg-slate-900 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Output Tokens</div>
          <div className="text-lg font-semibold text-blue-400">
            {formatTokens(stats.totalOutput)}
          </div>
        </div>
      </div>

      {/* Hourly Bar Chart */}
      <div className="mb-2">
        <div className="text-xs text-slate-400 mb-2">Hourly Usage (24h)</div>
        <div className="flex items-end gap-0.5 h-24">
          {hours.map((hour) => {
            const data = hourlyData.find(h => h.hour === hour) || { hour, input: 0, output: 0 };
            const total = data.input + data.output;
            const heightPercent = maxHourlyValue > 0 ? (total / maxHourlyValue) * 100 : 0;
            const inputPercent = total > 0 ? (data.input / total) * 100 : 50;

            const currentHour = new Date().getHours();
            const isCurrentHour = hour === currentHour;

            return (
              <div
                key={hour}
                className="flex-1 flex flex-col justify-end group relative"
              >
                <div
                  className={`w-full rounded-t transition-all ${isCurrentHour ? 'ring-1 ring-cyan-500' : ''}`}
                  style={{ height: `${Math.max(heightPercent, 2)}%` }}
                >
                  <div
                    className="w-full bg-green-500/70 rounded-t"
                    style={{ height: `${inputPercent}%` }}
                  />
                  <div
                    className="w-full bg-blue-500/70"
                    style={{ height: `${100 - inputPercent}%` }}
                  />
                </div>

                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                  <div className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs whitespace-nowrap">
                    <div className="font-medium text-white">{hour}:00</div>
                    <div className="text-green-400">In: {formatTokens(data.input)}</div>
                    <div className="text-blue-400">Out: {formatTokens(data.output)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Hour labels */}
        <div className="flex gap-0.5 mt-1">
          {hours.map((hour) => (
            <div key={hour} className="flex-1 text-center text-[8px] text-slate-500">
              {hour % 6 === 0 ? hour : ''}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-green-500/70 rounded" />
          <span className="text-slate-400">Input</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-blue-500/70 rounded" />
          <span className="text-slate-400">Output</span>
        </div>
      </div>

      {/* Daily Trend (if available) */}
      {dailyData.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="text-xs text-slate-400 mb-2">7-Day Trend</div>
          <div className="flex items-end gap-1 h-12">
            {dailyData.slice(-7).map((day, index) => {
              const total = day.input + day.output;
              const maxDaily = Math.max(...dailyData.map(d => d.input + d.output), 1);
              const heightPercent = (total / maxDaily) * 100;

              return (
                <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                  <div
                    className="w-full bg-gradient-to-t from-cyan-500/50 to-cyan-500/20 rounded-t"
                    style={{ height: `${Math.max(heightPercent, 5)}%` }}
                  />
                  <div className="text-[8px] text-slate-500 mt-1">
                    {new Date(day.date).toLocaleDateString([], { weekday: 'short' }).charAt(0)}
                  </div>

                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                    <div className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs whitespace-nowrap">
                      <div className="font-medium text-white">
                        {new Date(day.date).toLocaleDateString()}
                      </div>
                      <div className="text-cyan-400">{formatTokens(total)} tokens</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
