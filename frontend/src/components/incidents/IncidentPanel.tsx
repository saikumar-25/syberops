import { Incident } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import './IncidentPanel.css';

interface IncidentPanelProps {
  incidents: Incident[];
}

export function IncidentPanel({ incidents }: IncidentPanelProps) {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="incident-panel">
      <h3 className="panel-title">CORRELATED INCIDENTS</h3>

      {incidents.length === 0 ? (
        <div className="empty-state">No incidents to display</div>
      ) : (
        <div className="incident-list">
          {incidents.map((incident) => (
            <div key={incident.id} className="incident-card">
              <div className="incident-header">
                <div className="incident-left">
                  <div className="incident-id">{incident.id}</div>
                  <SeverityBadge severity={incident.severity} />
                </div>
                <div className={`incident-status status-${incident.status.toLowerCase().replace(' ', '-')}`}>
                  {incident.status}
                </div>
              </div>

              <div className="incident-title">{incident.title}</div>

              <div className="incident-meta">
                <span className="meta-item">
                  <span className="meta-label">Alerts:</span>
                  <span className="meta-value">{incident.alertCount}</span>
                </span>
                <span className="meta-item">
                  <span className="meta-label">Assets:</span>
                  <span className="meta-value">{incident.affectedAssets.length}</span>
                </span>
                <span className="meta-item">
                  <span className="meta-label">Created:</span>
                  <span className="meta-value">{formatDate(incident.createdAt)}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
