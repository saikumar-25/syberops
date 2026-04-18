import './SeverityChart.css';

interface SeverityChartProps {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export function SeverityChart({ critical, high, medium, low }: SeverityChartProps) {
  const total = critical + high + medium + low;
  const criticalPercent = total > 0 ? (critical / total) * 100 : 0;
  const highPercent = total > 0 ? (high / total) * 100 : 0;
  const mediumPercent = total > 0 ? (medium / total) * 100 : 0;
  const lowPercent = total > 0 ? (low / total) * 100 : 0;

  return (
    <div className="severity-chart">
      <h3 className="chart-title">SEVERITY DISTRIBUTION</h3>

      <div className="chart-bars">
        <div className="bar-group">
          <div className="bar-label">CRITICAL</div>
          <div className="bar-container">
            <div className="bar-fill critical" style={{ width: `${criticalPercent}%` }} />
          </div>
          <div className="bar-value">{critical}</div>
        </div>

        <div className="bar-group">
          <div className="bar-label">HIGH</div>
          <div className="bar-container">
            <div className="bar-fill high" style={{ width: `${highPercent}%` }} />
          </div>
          <div className="bar-value">{high}</div>
        </div>

        <div className="bar-group">
          <div className="bar-label">MEDIUM</div>
          <div className="bar-container">
            <div className="bar-fill medium" style={{ width: `${mediumPercent}%` }} />
          </div>
          <div className="bar-value">{medium}</div>
        </div>

        <div className="bar-group">
          <div className="bar-label">LOW</div>
          <div className="bar-container">
            <div className="bar-fill low" style={{ width: `${lowPercent}%` }} />
          </div>
          <div className="bar-value">{low}</div>
        </div>
      </div>
    </div>
  );
}
