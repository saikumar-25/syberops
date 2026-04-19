export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertStatus = 'new' | 'triaging' | 'triaged' | 'escalated' | 'closed' | 'false_positive';
export type Verdict = 'true_positive' | 'false_positive' | 'suspicious' | 'benign' | 'pending';

export interface Alert {
  id: string;
  timestamp: string;
  source: string;
  sourceIcon: string;
  title: string;
  description: string;
  severity: Severity;
  status: AlertStatus;
  verdict: Verdict;
  confidence: number;
  tenantId: string;
  affectedAssets: Asset[];
  iocs: IOC[];
  mitreTechniques: MitreTechnique[];
  agentSteps: AgentStep[];
  responseActions: ResponseAction[];
  rawPayload: Record<string, unknown>;
  triageStartedAt?: string;
  triageCompletedAt?: string;
  incidentId?: string;
}

export interface ToolCall {
  tool: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  executedAt: string;
}

export interface AgentStep {
  agentName: string;
  agentLabel: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  finding: string;
  detail?: string;
  toolCalls?: ToolCall[];
}

export interface Asset {
  id: string;
  type: 'host' | 'user' | 'ip' | 'domain' | 'process' | 'file';
  value: string;
  label: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  context?: string;
}

export interface IOC {
  type: 'ip' | 'domain' | 'hash' | 'email' | 'url' | 'file';
  value: string;
  malicious: boolean;
  confidence: number;
  source: string;
  tags: string[];
}

export interface MitreTechnique {
  id: string;
  name: string;
  tactic: string;
}

export interface ResponseAction {
  id: string;
  type: 'isolate_host' | 'reset_password' | 'block_ip' | 'create_ticket' | 'notify' | 'collect_logs';
  label: string;
  description: string;
  priority: 'immediate' | 'urgent' | 'normal';
  status: 'pending' | 'approved' | 'executed';
}

export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  status: 'investigating' | 'contained' | 'resolved';
  alertIds: string[];
  tenantId: string;
  createdAt: string;
  attackChain: MitreTechnique[];
  summary: string;
}

export interface Connector {
  id: string;
  name: string;
  type: string;
  icon: string;
  status: 'connected' | 'degraded' | 'disconnected';
  alertsToday: number;
  lastAlertAt: string;
  latencyMs: number;
}

export interface Metrics {
  alertsToday: number;
  alertsLastHour: number;
  aiAccuracy: number;
  avgMttdSeconds: number;
  avgMttrMinutes: number;
  truePositives: number;
  falsePositives: number;
  openAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
}

export type WSMessage =
  | { type: 'new_alert'; alert: Alert }
  | { type: 'triage_progress'; alertId: string; step: AgentStep; stepIndex: number }
  | { type: 'alert_updated'; alert: Alert }
  | { type: 'metrics_update'; metrics: Metrics }
  | { type: 'connected'; message: string };
