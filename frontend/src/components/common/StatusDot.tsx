import './StatusDot.css';

interface StatusDotProps {
  status: 'connected' | 'disconnected' | 'connecting' | 'error' | 'active' | 'inactive';
  label?: string;
  animate?: boolean;
}

export function StatusDot({ status, label, animate = false }: StatusDotProps) {
  const statusClass = animate ? `status-dot status-${status} animate` : `status-dot status-${status}`;

  return (
    <div className="status-dot-container">
      <div className={statusClass} />
      {label && <span className="status-label">{label}</span>}
    </div>
  );
}
