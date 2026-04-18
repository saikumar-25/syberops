import { Severity } from '../../types';

interface SeverityBadgeProps {
  severity: Severity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const getSeverityClass = (sev: Severity): string => {
    switch (sev) {
      case 'CRITICAL':
        return 'badge-critical';
      case 'HIGH':
        return 'badge-high';
      case 'MEDIUM':
        return 'badge-medium';
      case 'LOW':
        return 'badge-low';
      case 'INFO':
        return 'badge-info';
      default:
        return 'badge-low';
    }
  };

  const getSeverityIcon = (sev: Severity): string => {
    switch (sev) {
      case 'CRITICAL':
        return '●';
      case 'HIGH':
        return '●';
      case 'MEDIUM':
        return '●';
      case 'LOW':
        return '○';
      case 'INFO':
        return '◌';
      default:
        return '○';
    }
  };

  return (
    <span className={`badge ${getSeverityClass(severity)}`}>
      {getSeverityIcon(severity)} {severity}
    </span>
  );
}
