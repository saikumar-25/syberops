import { useState } from 'react';
import { Alert } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { VerdictBadge } from '../ai/VerdictBadge';
import { ConfidenceRing } from '../ai/ConfidenceRing';
import { AgentPipeline } from '../ai/AgentPipeline';
import { apiClient } from '../../api/client';
import { useAppStore } from '../../store/appStore';
import './AlertDetail.css';

/** Safely extract a display string from a string or Asset object */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assetLabel(asset: any): string {
  if (!asset) return '';
  if (typeof asset === 'string') return asset;
  return asset.value ?? asset.label ?? asset.id ?? JSON.stringify(asset);
}

interface AlertDetailProps {
  alert: Alert | null;
  onClose: () => void;
  onAlertUpdate?: (alertId: string, changes: Partial<Alert>) => void;
}

export function AlertDetail({ alert, onClose }: AlertDetailProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'investigation' | 'evidence' | 'response'>('overview');
  const [isTriaging, setIsTriaging] = useState(false);
  const [triageError, setTriageError] = useState<string | null>(null);
  const { demoMode, hasRealAI } = useAppStore();

  if (!alert) return null;

  const formatTime = (timestamp: string): string =>
    new Date(timestamp).toLocaleString('en-US', { hour12: false });

  const handleRunTriage = async () => {
    if (isTriaging) return;
    setIsTriaging(true);
    setTriageError(null);
    // Switch to investigation tab so the user can watch the agents run
    setActiveTab('investigation');
    try {
      await apiClient.triageAlert(alert.id);
      // Progress arrives via WebSocket → useAlerts handles it automatically
    } catch (err) {
      setTriageError('Failed to start triage. Is the backend running?');
    } finally {
      // Keep spinner going until alert_updated WS message arrives
      // (useAlerts sets selectedAlert which triggers a re-render)
      setTimeout(() => setIsTriaging(false), 2000);
    }
  };

  const isAlreadyTriaged = alert.status === 'TRIAGED' && (alert.agentSteps ?? []).length > 0;
  const isCurrentlyTriaging = alert.status === 'TRIAGING' || isTriaging;

  /* ── AI Triage button label ── */
  const triage_label = () => {
    if (isCurrentlyTriaging) return '⏳ Running AI Triage…';
    if (isAlreadyTriaged) return '🔁 Re-run AI Triage';
    return demoMode ? '🤖 Run AI Triage (Demo)' : '🤖 Run Claude AI Triage';
  };

  return (
    <>
      <div className="alert-detail-overlay" onClick={onClose} />
      <div className="alert-detail-panel">

        {/* Header */}
        <div className="detail-header">
          <div className="header-left">
            <h3 className="detail-title">{alert.id}</h3>
            <SeverityBadge severity={alert.severity} />
          </div>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="detail-subtitle">{alert.title}</div>
        <div className="detail-meta">
          {alert.source} · {formatTime(alert.timestamp)} · {assetLabel(alert.affectedAssets?.[0]) || 'Unknown'}
        </div>

        {/* AI Mode badge */}
        <div className="detail-mode-bar">
          {demoMode
            ? <span className="mode-tag demo">🔄 Demo Mode — Simulation Engine</span>
            : hasRealAI
              ? <span className="mode-tag ai">🤖 AI Mode — Claude {process.env.NODE_ENV === 'production' ? '' : 'Agents'} Active</span>
              : <span className="mode-tag warn">⚠️ No Claude API key — add ANTHROPIC_API_KEY to backend</span>
          }
        </div>

        {/* Tabs */}
        <div className="detail-tabs">
          {(['overview', 'investigation', 'evidence', 'response'] as const).map((tab) => (
            <button
              key={tab}
              className={`tab-button ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'investigation' ? 'AI Investigation' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="detail-content">

          {/* ── Overview ── */}
          {activeTab === 'overview' && (
            <div className="tab-content">
              <div className="card">
                <div className="card-header">AI VERDICT</div>
                <div className="verdict-card">
                  <div className="verdict-badge-large">
                    <VerdictBadge verdict={alert.verdict || null} size="lg" />
                  </div>
                  {alert.confidence !== undefined && (
                    <div className="verdict-confidence">
                      <span>Confidence:</span>
                      <ConfidenceRing confidence={alert.confidence} size={64} />
                    </div>
                  )}
                </div>
              </div>

              {alert.description && (
                <div className="card">
                  <div className="card-header">DESCRIPTION</div>
                  <div className="card-content">{alert.description}</div>
                </div>
              )}

              {alert.affectedAssets && alert.affectedAssets.length > 0 && (
                <div className="card">
                  <div className="card-header">AFFECTED ASSETS</div>
                  <div className="asset-list">
                    {alert.affectedAssets.map((asset, idx) => (
                      <div key={idx} className="asset-item">
                        <span className="asset-icon">💻</span>
                        <span className="asset-name">{typeof asset === 'string' ? asset : (asset as { value?: string }).value ?? String(asset)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {alert.mitreTechniques && alert.mitreTechniques.length > 0 && (
                <div className="card">
                  <div className="card-header">MITRE ATT&CK</div>
                  <div className="technique-list">
                    {alert.mitreTechniques.map((t, idx) => (
                      <span key={idx} className="technique-badge">
                        {typeof t === 'string' ? t : `${(t as { id?: string }).id} — ${(t as { name?: string }).name}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="card">
                <div className="card-header">QUICK ACTIONS</div>
                <div className="action-buttons">
                  <button className="action-btn">🔒 Isolate Host</button>
                  <button className="action-btn">🔄 Reset Passwords</button>
                  <button className="action-btn">📋 Create Ticket</button>
                </div>
              </div>
            </div>
          )}

          {/* ── AI Investigation ── */}
          {activeTab === 'investigation' && (
            <div className="tab-content">
              {/* Run Triage button */}
              <div className="triage-action-bar">
                <button
                  className={`triage-btn ${isCurrentlyTriaging ? 'running' : ''} ${isAlreadyTriaged ? 'retriage' : 'primary'}`}
                  onClick={handleRunTriage}
                  disabled={isCurrentlyTriaging}
                >
                  {triage_label()}
                </button>
                {!demoMode && hasRealAI && (
                  <span className="triage-hint">Uses real Claude AI agents — results stream live</span>
                )}
                {demoMode && (
                  <span className="triage-hint">Toggle to AI Mode in the top bar to use Claude agents</span>
                )}
              </div>

              {triageError && (
                <div className="triage-error">{triageError}</div>
              )}

              <AgentPipeline steps={alert.agentSteps} />
            </div>
          )}

          {/* ── Evidence ── */}
          {activeTab === 'evidence' && (
            <div className="tab-content">
              <div className="card">
                <div className="card-header">RAW PAYLOAD</div>
                <pre className="json-viewer">{JSON.stringify(alert.rawPayload || {}, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* ── Response ── */}
          {activeTab === 'response' && (
            <div className="tab-content">
              <div className="card">
                <div className="card-header">RESPONSE ACTIONS</div>
                <div className="response-actions">
                  {['Isolate host from network', 'Reset user credentials', 'Enable enhanced logging', 'Create incident ticket'].map((action) => (
                    <label key={action} className="action-checkbox">
                      <input type="checkbox" />
                      <span>{action}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="card-header">NOTES</div>
                <textarea
                  className="response-notes"
                  placeholder="Add investigation notes here..."
                  rows={4}
                />
              </div>
              <div className="card">
                <div className="card-header">ASSIGN TO</div>
                <select className="response-select">
                  <option>Select analyst...</option>
                  <option>Alice Johnson</option>
                  <option>Bob Smith</option>
                  <option>Carol White</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
