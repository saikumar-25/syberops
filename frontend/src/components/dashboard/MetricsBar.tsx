import { Metrics } from '../../types';
import './MetricsBar.css';

interface MetricsBarProps {
  metrics: Metrics;
}

function fmt(n: number | undefined, decimals = 0): string {
  if (n === undefined || n === null || isNaN(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

export function MetricsBar({ metrics }: MetricsBarProps) {
  const total = (metrics.truePositives ?? 0) + (metrics.falsePositives ?? 0);
  const tpPct = total > 0 ? ((metrics.truePositives / total) * 100).toFixed(1) : '—';
  const fpRate = total > 0 ? ((metrics.falsePositives / total) * 100).toFixed(1) : '—';

  return (
    <div className="metrics-bar">
      <div className="metric-card">
        <div className="metric-label">ALERTS / 24H</div>
        <div className="metric-value">{fmt(metrics.alertsToday)}</div>
        <div className="metric-trend neutral">{fmt(metrics.alertsLastHour)} last hour</div>
      </div>

      <div className="metric-card">
        <div className="metric-label">AI ACCURACY</div>
        <div className="metric-value accent-green">{fmt(metrics.aiAccuracy, 1)}%</div>
        <div className="metric-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(metrics.aiAccuracy ?? 0, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-label">AVG MTTD</div>
        <div className="metric-value accent-cyan">{fmt(metrics.avgMttdSeconds, 1)}s</div>
        <div className="metric-trend positive">⚡ Under 30s target</div>
      </div>

      <div className="metric-card">
        <div className="metric-label">AVG MTTR</div>
        <div className="metric-value">{fmt(metrics.avgMttrMinutes, 1)} min</div>
        <div className="metric-trend positive">✓ Within SLA</div>
      </div>

      <div className="metric-card">
        <div className="metric-label">TRUE POS</div>
        <div className="metric-value accent-green">{fmt(metrics.truePositives)}</div>
        <div className="metric-trend neutral">{tpPct}% of triaged</div>
      </div>

      <div className="metric-card">
        <div className="metric-label">FALSE POS</div>
        <div className="metric-value accent-orange">{fmt(metrics.falsePositives)}</div>
        <div className="metric-trend neutral">{fpRate}% rate</div>
      </div>
    </div>
  );
}
