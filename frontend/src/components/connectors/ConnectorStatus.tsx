import { Connector } from '../../types';
import { StatusDot } from '../common/StatusDot';
import './ConnectorStatus.css';

interface ConnectorStatusProps {
  connectors: Connector[];
}

export function ConnectorStatus({ connectors }: ConnectorStatusProps) {
  const formatLastUpdate = (dateString?: string): string => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="connector-status">
      <h3 className="status-title">INTEGRATION HEALTH</h3>

      <div className="connector-grid">
        {connectors.map((connector) => (
          <div key={connector.id} className={`connector-card status-${connector.status}`}>
            <div className="connector-header">
              {connector.icon && <span className="connector-icon">{connector.icon}</span>}
              <span className="connector-name">{connector.name}</span>
            </div>

            <div className="connector-status-badge">
              <StatusDot status={connector.status as any} />
              <span className="status-text">{connector.status.charAt(0).toUpperCase() + connector.status.slice(1)}</span>
            </div>

            <div className="connector-stats">
              <div className="stat">
                <span className="stat-label">Alerts today</span>
                <span className="stat-value">{connector.alertsToday}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Last update</span>
                <span className="stat-value">{formatLastUpdate(connector.lastUpdate)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
