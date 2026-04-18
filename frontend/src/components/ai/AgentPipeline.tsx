import { AgentStep } from '../../types';
import './AgentPipeline.css';

interface AgentPipelineProps {
  steps?: AgentStep[];
}

const agentNames: Record<string, string> = {
  AlertIntakeAgent: 'Initial Classification',
  EnrichmentAgent: 'Context Enrichment',
  ThreatIntelAgent: 'Threat Intelligence',
  CorrelationAgent: 'Alert Correlation',
  InvestigationAgent: 'Deep Investigation',
  VerdictAgent: 'Verdict Rendering',
  ResponseAgent: 'Response Planning',
  ComplianceAgent: 'Compliance Check',
};

const defaultSteps: AgentStep[] = [
  { agentName: 'AlertIntakeAgent', agentLabel: 'Alert Intake', status: 'pending' },
  { agentName: 'EnrichmentAgent', agentLabel: 'Enrichment', status: 'pending' },
  { agentName: 'ThreatIntelAgent', agentLabel: 'Threat Intelligence', status: 'pending' },
  { agentName: 'CorrelationAgent', agentLabel: 'Correlation', status: 'pending' },
  { agentName: 'InvestigationAgent', agentLabel: 'Investigation', status: 'pending' },
  { agentName: 'VerdictAgent', agentLabel: 'Verdict', status: 'pending' },
  { agentName: 'ResponseAgent', agentLabel: 'Response Planning', status: 'pending' },
  { agentName: 'ComplianceAgent', agentLabel: 'Compliance', status: 'pending' },
];

export function AgentPipeline({ steps = defaultSteps }: AgentPipelineProps) {
  const totalDuration = steps.reduce((sum, s) => sum + (s.durationMs || 0), 0);

  const getStatusIcon = (status: AgentStep['status']): string => {
    switch (status) {
      case 'complete':
        return '✅';
      case 'running':
        return '⚙️';
      case 'error':
        return '❌';
      case 'pending':
        return '⭕';
      default:
        return '⭕';
    }
  };

  const formatDuration = (ms?: number): string => {
    if (!ms) return '0ms';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Normalise status for CSS class (backend sends 'complete', CSS expects 'completed')
  const cssStatus = (status: AgentStep['status']) =>
    status === 'complete' ? 'completed' : status;

  return (
    <div className="agent-pipeline">
      <div className="pipeline-header">
        <h3 className="pipeline-title">AI INVESTIGATION PIPELINE</h3>
        <div className="pipeline-stats">
          <span className="stat-label">Total Time:</span>
          <span className="stat-value">{formatDuration(totalDuration)}</span>
        </div>
      </div>

      <div className="pipeline-divider" />

      <div className="pipeline-steps">
        {steps.map((step) => (
          <div key={step.agentName} className={`pipeline-step status-${cssStatus(step.status)}`}>
            <div className="step-header">
              <div className="step-left">
                <span className="step-icon">{getStatusIcon(step.status)}</span>
                <span className="step-agent">{step.agentLabel || agentNames[step.agentName] || step.agentName}</span>
              </div>
              <div className="step-right">
                {step.status === 'running' && <span className="step-progress">Running...</span>}
                {step.status === 'complete' && (
                  <span className="step-duration">{formatDuration(step.durationMs)}</span>
                )}
              </div>
            </div>

            {step.status !== 'pending' && (
              <div className="step-progress-bar">
                <div
                  className={`progress-fill ${step.status === 'running' ? 'animate' : ''}`}
                  style={{
                    width: step.status === 'complete' ? '100%' : '65%',
                  }}
                />
              </div>
            )}

            {step.finding && (
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
