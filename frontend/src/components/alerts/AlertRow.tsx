import { memo } from 'react';
import { Alert } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { VerdictBadge } from '../ai/VerdictBadge';
import { ConfidenceRing } from '../ai/ConfidenceRing';
import './AlertRow.css';

interface AlertRowProps {
  alert: Alert;
  isNew?: boolean;
  onSelect?: (alert: Alert) => void;
}

const sourceIcons: Record<string, string> = {
  CrowdStrike: '🦅',
  Splunk: '🔍',
  Sentinel: '☁️',
  'Palo Alto': '🔥',
  Okta: '🔑',
  default: '📡',
};

export const AlertRow = memo(function AlertRow({ alert, isNew, onSelect }: AlertRowProps) {
  const getSourceIcon = (source: string): string => {
    return sourceIcons[source] || sourceIcons['default'];
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  return (
    <tr
      className={`alert-row severity-${alert.severity.toLowerCase()} ${
        alert.status === 'TRIAGING' ? 'triaging' : ''
      } ${isNew ? 'new' : ''}`}
      onClick={() => onSelect?.(alert)}
    >
      <td className="cell-id">{alert.id}</td>
      <td className="cell-time">{formatTime(alert.timestamp)}</td>
      <td className="cell-source">
        <span className="source-icon">{getSourceIcon(alert.source)}</span>
        {alert.source}
      </td>
      <td className="cell-title">{alert.title}</td>
      <td className="cell-severity">
        <SeverityBadge severity={alert.severity} />
      </td>
      <td className="cell-status">
        {alert.status === 'TRIAGING' ? (
          <span className="status-triaging">⚙️ TRIAGING</span>
        ) : (
          <span className={`status-badge status-${alert.status.toLowerCase()}`}>
            {alert.status}
          </span>
        )}
      </td>
      <td className="cell-verdict">
        <VerdictBadge verdict={alert.verdict || null} size="sm" />
      </td>
      <td className="cell-confidence">
        {alert.confidence !== undefined && alert.verdict ? (
          <div className="confidence-display">
            <ConfidenceRing confidence={alert.confidence} size={40} />
          </div>
        ) : (
          <span className="confidence-empty">—</span>
        )}
      </td>
      <td className="cell-actions">
        <button className="action-button">View</button>
      </td>
    </tr>
  );
});
