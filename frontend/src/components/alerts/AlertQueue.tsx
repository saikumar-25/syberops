import { useState, useMemo } from 'react';
import { Alert, AlertStatus, Severity } from '../../types';
import { AlertRow } from './AlertRow';
import { Skeleton } from '../common/Skeleton';
import './AlertQueue.css';

interface AlertQueueProps {
  alerts: Alert[];
  isLoading: boolean;
  onSelectAlert: (alert: Alert) => void;
}

export function AlertQueue({
  alerts,
  isLoading,
  onSelectAlert,
}: AlertQueueProps) {
  const [severityFilter, setSeverityFilter] = useState<Severity | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'ALL'>('ALL');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (severityFilter !== 'ALL' && alert.severity !== severityFilter) {
        return false;
      }
      if (statusFilter !== 'ALL' && alert.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [alerts, severityFilter, statusFilter]);

  return (
    <div className="alert-queue">
      <div className="queue-header">
        <h2 className="queue-title">ALERT QUEUE</h2>
        <div className="queue-controls">
          <select
            className="filter-select"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as Severity | 'ALL')}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AlertStatus | 'ALL')}
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="TRIAGING">Triaging</option>
            <option value="TRIAGED">Triaged</option>
            <option value="ESCALATED">Escalated</option>
          </select>

          <div className="refresh-toggle">
            <input
              type="checkbox"
              id="auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <label htmlFor="auto-refresh">🔄 Auto-refresh</label>
          </div>
        </div>
      </div>

      <div className="queue-stats">
        <span className="stat">
          {filteredAlerts.length} results
          {autoRefresh && <span className="live-indicator"> ● LIVE</span>}
        </span>
      </div>

      <div className="queue-table-wrapper">
        {isLoading ? (
          <div className="queue-loading">
            <Skeleton height="40px" count={5} />
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="queue-empty">
            <div className="empty-icon">📭</div>
            <div className="empty-text">No alerts match your filters</div>
          </div>
        ) : (
          <table className="queue-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>TIME</th>
                <th>SOURCE</th>
                <th>TITLE</th>
                <th>SEVERITY</th>
                <th>STATUS</th>
                <th>AI VERDICT</th>
                <th>CONF</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((alert, idx) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  isNew={idx === 0 && alerts[0]?.id === alert.id}
                  onSelect={onSelectAlert}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
