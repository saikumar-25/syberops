import { useState } from 'react';
import { AgentStep, ToolCall } from '../../types';
import './AgentPipeline.css';

interface AgentPipelineProps {
  steps?: AgentStep[];
}

const defaultSteps: AgentStep[] = [
  { agentName: 'AlertIntakeAgent',   agentLabel: 'Alert Intake',        status: 'pending' },
  { agentName: 'EnrichmentAgent',    agentLabel: 'Context Enrichment',   status: 'pending' },
  { agentName: 'ThreatIntelAgent',   agentLabel: 'Threat Intelligence',  status: 'pending' },
  { agentName: 'CorrelationAgent',   agentLabel: 'Alert Correlation',    status: 'pending' },
  { agentName: 'InvestigationAgent', agentLabel: 'Deep Investigation',   status: 'pending' },
  { agentName: 'VerdictAgent',       agentLabel: 'Verdict Rendering',    status: 'pending' },
  { agentName: 'ResponseAgent',      agentLabel: 'Response Planning',    status: 'pending' },
  { agentName: 'ComplianceAgent',    agentLabel: 'Compliance Check',     status: 'pending' },
];

const TOOL_ICONS: Record<string, string> = {
  lookup_ip_reputation:    '🌐',
  lookup_file_hash:        '🔬',
  search_mitre_attack:     '🛡️',
  lookup_domain_reputation:'🔗',
  get_asset_risk_profile:  '💻',
};

const TOOL_LABELS: Record<string, string> = {
  lookup_ip_reputation:    'IP Reputation',
  lookup_file_hash:        'File Hash Lookup',
  search_mitre_attack:     'MITRE ATT&CK',
  lookup_domain_reputation:'Domain Reputation',
  get_asset_risk_profile:  'Asset Risk Profile',
};

function getStatusIcon(status: AgentStep['status']): string {
  switch (status) {
    case 'complete': return '✅';
    case 'running':  return '⚙️';
    case 'error':    return '❌';
    case 'pending':  return '⭕';
    default:         return '⭕';
  }
}

function formatDuration(ms?: number): string {
  if (!ms) return '';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function cssStatus(status: AgentStep['status']): string {
  return status === 'complete' ? 'completed' : status;
}

/** Render a single key-value pair from tool output */
function ToolOutputRow({ k, v }: { k: string; v: unknown }) {
  if (v === null || v === undefined || v === '') return null;
  if (Array.isArray(v)) {
    if (v.length === 0) return null;
    return (
      <div className="tool-output-row">
        <span className="tool-output-key">{k}:</span>
        <span className="tool-output-val">{v.join(', ')}</span>
      </div>
    );
  }
  if (typeof v === 'object') return null; // skip nested objects
  const strVal = String(v);
  const isScore = k.includes('score') || k.includes('rate') || k.includes('count');
  const isBad   = strVal === 'malicious' || strVal === 'true' || (isScore && Number(v) >= 70);
  const isGood  = strVal === 'clean' || strVal === 'benign' || strVal === 'false' || (isScore && Number(v) < 30);
  return (
    <div className="tool-output-row">
      <span className="tool-output-key">{k.replace(/_/g, ' ')}:</span>
      <span className={`tool-output-val ${isBad ? 'val-bad' : isGood ? 'val-good' : ''}`}>
        {strVal}
      </span>
    </div>
  );
}

function ToolCallCard({ call }: { call: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const icon  = TOOL_ICONS[call.tool]  ?? '🔧';
  const label = TOOL_LABELS[call.tool] ?? call.tool;

  // Pick the most interesting input value to show in the collapsed summary
  const inputSummary = Object.values(call.input)[0] as string | undefined;
  const verdict = call.output.verdict as string | undefined;
  const score   = call.output.threat_score as number | undefined;
  const detect  = call.output.detection_rate as string | undefined;

  const badgeText  = verdict ?? detect ?? (score !== undefined ? `${score}/100` : null);
  const badgeClass = verdict === 'malicious' || (score !== undefined && score >= 70)
    ? 'tool-badge-bad'
    : verdict === 'clean' || verdict === 'benign' || (score !== undefined && score < 30)
    ? 'tool-badge-good'
    : 'tool-badge-neutral';

  return (
    <div className="tool-call-card" onClick={() => setExpanded((e) => !e)}>
      <div className="tool-call-header">
        <span className="tool-call-icon">{icon}</span>
        <span className="tool-call-label">{label}</span>
        {inputSummary && (
          <code className="tool-call-input">({String(inputSummary).substring(0, 40)})</code>
        )}
        {badgeText && <span className={`tool-badge ${badgeClass}`}>{badgeText}</span>}
        <span className="tool-expand">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="tool-output-grid">
          {Object.entries(call.output).map(([k, v]) => (
            <ToolOutputRow key={k} k={k} v={v} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AgentPipeline({ steps = defaultSteps }: AgentPipelineProps) {
  const totalDuration = steps.reduce((sum, s) => sum + (s.durationMs ?? 0), 0);
  const totalTools    = steps.reduce((sum, s) => sum + (s.toolCalls?.length ?? 0), 0);

  return (
    <div className="agent-pipeline">
      <div className="pipeline-header">
        <h3 className="pipeline-title">AI INVESTIGATION PIPELINE</h3>
        <div className="pipeline-stats">
          {totalTools > 0 && (
            <span className="stat-tools">🔧 {totalTools} tool calls</span>
          )}
          {totalDuration > 0 && (
            <>
              <span className="stat-label">Total:</span>
              <span className="stat-value">{formatDuration(totalDuration)}</span>
            </>
          )}
        </div>
      </div>

      <div className="pipeline-divider" />

      <div className="pipeline-steps">
        {steps.map((step) => (
          <div
            key={step.agentName}
            className={`pipeline-step status-${cssStatus(step.status)}`}
          >
            {/* Agent header */}
            <div className="step-header">
              <div className="step-left">
                <span className="step-icon">{getStatusIcon(step.status)}</span>
                <span className="step-agent">
                  {step.agentLabel ?? step.agentName}
                </span>
                {(step.toolCalls?.length ?? 0) > 0 && (
                  <span className="step-tool-count">
                    {step.toolCalls!.length} tool{step.toolCalls!.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="step-right">
                {step.status === 'running' && (
                  <span className="step-running">⚡ Running…</span>
                )}
                {step.status === 'complete' && step.durationMs && (
                  <span className="step-duration">{formatDuration(step.durationMs)}</span>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {step.status !== 'pending' && (
              <div className="step-progress-bar">
                <div
                  className={`progress-fill ${step.status === 'running' ? 'animate' : ''}`}
                  style={{ width: step.status === 'complete' ? '100%' : '65%' }}
                />
              </div>
            )}

            {/* Tool calls — shown in real-time as they arrive */}
            {(step.toolCalls?.length ?? 0) > 0 && (
              <div className="tool-calls-section">
                {step.toolCalls!.map((call, idx) => (
                  <ToolCallCard key={idx} call={call} />
                ))}
              </div>
            )}

            {/* Final finding */}
            {step.finding && step.status !== 'pending' && (
              <div className="step-output">
                <span className="output-text">{step.finding}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="pipeline-divider" />
    </div>
  );
}
