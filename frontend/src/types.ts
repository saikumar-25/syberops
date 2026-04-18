/* Severity levels */
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

/* Alert status */
export type AlertStatus = 'NEW' | 'TRIAGING' | 'TRIAGED' | 'ESCALATED' | 'CONTAINED';

/* AI verdict types */
export type Verdict = 'TRUE_POSITIVE' | 'FALSE_POSITIVE' | 'SUSPICIOUS' | null;

/* Alert interface */
export interface Alert {
  id: string;
  timestamp: string;
  source: string;
  sourceIcon?: string;
  title: string;
  description?: string;
  severity: Severity;
  status: AlertStatus;
  verdict?: Verdict;
  confidence?: number;
  affectedAssets?: string[];
  mitreTechniques?: string[];
  agentSteps?: AgentStep[];
  rawPayload?: Record<string, unknown>;
}

/* AI Agent step in triaging process */
export interface AgentStep {
  agentName: string;
  agentLabel: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  finding?: string;
  detail?: string;
}

/* Metrics — field names match the backend /api/metrics response */
export interface Metrics {
  alertsToday: number;
  alertsLastHour: number;
  aiAccuracy: number;       // percentage 0-100
  avgMttdSeconds: number;   // seconds
  avgMttrMinutes: number;   // minutes
  truePositives: number;
  falsePositives: number;
  openAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
}

/* Incident */
export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  status: 'Investigating' | 'Contained' | 'Resolved';
  alertCount: number;
  affectedAssets: string[];
  createdAt: string;
  lastUpdated: string;
}

/* Connector status */
export interface Connector {
  id: string;
  name: string;
  icon?: string;
  status: 'connected' | 'degraded' | 'offline';
  alertsToday: number;
  lastUpdate?: string;
}

/* WebSocket message types */
export interface WSMessage {
  type: 'new_alert' | 'triage_progress' | 'alert_updated' | 'metrics_update' | 'heartbeat';
  payload: unknown;
}

/* Tenant */
export interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

/* Filter state */
export interface FilterState {
  severity?: Severity | 'ALL';
  status?: AlertStatus | 'ALL';
  source?: string | 'ALL';
  searchTerm?: string;
}
