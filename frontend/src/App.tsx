import { useState, useCallback, useEffect, Component, ReactNode } from 'react';
import { AppContext, AppContextType } from './store/appStore';
import { Tenant, Incident, Connector } from './types';
import { useAlerts } from './hooks/useAlerts';
import { useMetrics } from './hooks/useMetrics';
import { useWebSocket } from './hooks/useWebSocket';
import { MainLayout } from './components/layout/MainLayout';
import { AlertQueue } from './components/alerts/AlertQueue';
import { AlertDetail } from './components/alerts/AlertDetail';
import { MetricsBar } from './components/dashboard/MetricsBar';
import { LiveFeed } from './components/dashboard/LiveFeed';
import { SeverityChart } from './components/dashboard/SeverityChart';
import { IncidentPanel } from './components/incidents/IncidentPanel';
import { ConnectorStatus } from './components/connectors/ConnectorStatus';
import { apiClient } from './api/client';
import './App.css';

/* ── Error Boundary ─────────────────────────────────────── */
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh',
          background: '#0a0e1a', color: '#ef4444', fontFamily: 'monospace', padding: 40,
        }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⚠ SyberOps Error</div>
          <div style={{ color: '#94a3b8', marginBottom: 8 }}>A component crashed. Details:</div>
          <pre style={{
            background: '#1e293b', padding: 16, borderRadius: 8,
            color: '#f1f5f9', fontSize: 12, maxWidth: 700, overflowX: 'auto',
          }}>
            {(this.state.error as Error).message}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: 24, padding: '10px 24px', background: '#00d4ff',
              color: '#0a0e1a', border: 'none', borderRadius: 4,
              cursor: 'pointer', fontWeight: 700,
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Static mock data ───────────────────────────────────── */
const MOCK_TENANTS: Tenant[] = [
  { id: 'acme',    name: 'Acme Corp',    status: 'active' },
  { id: 'techcorp', name: 'TechCorp Inc', status: 'active' },
  { id: 'finserv',  name: 'FinServe LLC', status: 'active' },
];

const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'INC-2026-0847',
    title: 'Mimikatz + Lateral Movement Campaign',
    severity: 'CRITICAL',
    status: 'Investigating',
    alertCount: 3,
    affectedAssets: ['WIN-CORP-042', 'WIN-CORP-019'],
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    lastUpdated: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 'INC-2026-0846',
    title: 'Brute Force + Account Takeover',
    severity: 'HIGH',
    status: 'Contained',
    alertCount: 5,
    affectedAssets: ['WEBSERVER-01'],
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    lastUpdated: new Date(Date.now() - 3600000).toISOString(),
  },
];

const MOCK_CONNECTORS: Connector[] = [
  { id: 'crowdstrike', name: 'CrowdStrike Falcon', icon: '🦅', status: 'connected',  alertsToday: 247,  lastUpdate: new Date(Date.now() - 12000).toISOString() },
  { id: 'splunk',      name: 'Splunk SIEM',        icon: '🔍', status: 'connected',  alertsToday: 1834, lastUpdate: new Date(Date.now() - 3000).toISOString() },
  { id: 'sentinel',    name: 'Azure Sentinel',     icon: '☁️', status: 'degraded',  alertsToday: 423,  lastUpdate: new Date(Date.now() - 120000).toISOString() },
  { id: 'paloalto',   name: 'Palo Alto Networks',  icon: '🔥', status: 'connected',  alertsToday: 156,  lastUpdate: new Date(Date.now() - 45000).toISOString() },
  { id: 'okta',       name: 'Okta Identity',       icon: '🔑', status: 'connected',  alertsToday: 89,   lastUpdate: new Date(Date.now() - 600000).toISOString() },
];

/* ── Main App ───────────────────────────────────────────── */
export default function App() {
  const [currentTenant, setCurrentTenant] = useState<Tenant>(MOCK_TENANTS[0]);
  const [currentView, setCurrentView]     = useState<AppContextType['currentView']>('dashboard');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [demoMode, setDemoMode]           = useState(true);
  const [hasRealAI, setHasRealAI]         = useState(false);

  useEffect(() => {
    apiClient.getAIStatus()
      .then(({ realAI }) => setHasRealAI(realAI))
      .catch(() => setHasRealAI(false));
  }, []);

  const alertsData  = useAlerts(currentTenant.id);
  const metricsData = useMetrics(currentTenant.id);

  const handleWSMessage = useCallback((msg: unknown) => {
    alertsData.handleWSMessage(msg as Parameters<typeof alertsData.handleWSMessage>[0]);
    metricsData.handleWSMessage(msg);
  }, [alertsData.handleWSMessage, metricsData.handleWSMessage]); // eslint-disable-line

  const { isConnected } = useWebSocket({ onMessage: handleWSMessage });

  const appContext: AppContextType = {
    currentTenant,
    setCurrentTenant,
    tenants: MOCK_TENANTS,
    setTenants: () => {},
    currentView,
    setCurrentView,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    demoMode,
    setDemoMode,
    hasRealAI,
    setHasRealAI,
  };

  const viewTitle: Record<AppContextType['currentView'], string> = {
    dashboard:      'Dashboard',
    alerts:         'Alert Queue',
    investigations: 'Investigations',
    incidents:      'Incidents',
    connectors:     'Connectors',
    tenants:        'Tenant Management',
    settings:       'Settings',
  };

  const lowAlerts = alertsData.allAlerts.filter((a) => a.severity === 'LOW').length;

  return (
    <ErrorBoundary>
      <AppContext.Provider value={appContext}>
        <MainLayout
          title={viewTitle[currentView]}
          wsConnected={isConnected}
          alertStats={{
            critical: alertsData.stats.critical,
            high:     alertsData.stats.high,
          }}
        >
          {currentView === 'dashboard' && (
            <div className="dashboard-view">
              <MetricsBar metrics={metricsData.metrics} />
              <SeverityChart
                critical={alertsData.stats.critical}
                high={alertsData.stats.high}
                medium={alertsData.stats.medium}
                low={lowAlerts}
              />
              <LiveFeed alerts={alertsData.allAlerts} />
              <IncidentPanel incidents={MOCK_INCIDENTS} />
              <ConnectorStatus connectors={MOCK_CONNECTORS} />
            </div>
          )}
          {currentView === 'alerts' && (
            <AlertQueue
              alerts={alertsData.alerts}
              isLoading={alertsData.isLoading}
              onSelectAlert={alertsData.setSelectedAlert}
            />
          )}
          {currentView === 'investigations' && (
            <div className="placeholder-view">
              <h2>🔍 Investigations</h2>
              <p>Full investigation workspace coming in the next build.</p>
            </div>
          )}
          {currentView === 'incidents' && <IncidentPanel incidents={MOCK_INCIDENTS} />}
          {currentView === 'connectors' && <ConnectorStatus connectors={MOCK_CONNECTORS} />}
          {currentView === 'tenants' && (
            <div className="placeholder-view">
              <h2>🏢 Tenant Management</h2>
              <p>Multi-tenant MSSP management coming in the next build.</p>
            </div>
          )}
          {currentView === 'settings' && (
            <div className="placeholder-view">
              <h2>⚙️ Settings</h2>
              <p>Platform configuration coming in the next build.</p>
            </div>
          )}
        </MainLayout>

        <AlertDetail
          alert={alertsData.selectedAlert}
          onClose={() => alertsData.setSelectedAlert(null)}
          onAlertUpdate={alertsData.updateAlert}
        />
      </AppContext.Provider>
    </ErrorBoundary>
  );
}
