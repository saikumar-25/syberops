import { useState } from 'react';
import { StatusDot } from '../common/StatusDot';
import { useAppStore } from '../../store/appStore';
import './Sidebar.css';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
  view: 'dashboard' | 'alerts' | 'investigations' | 'incidents' | 'connectors' | 'tenants' | 'settings';
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '🎯', view: 'dashboard' },
  { id: 'alerts', label: 'Alert Queue', icon: '🚨', badge: 12, view: 'alerts' },
  { id: 'investigations', label: 'Investigations', icon: '🔍', view: 'investigations' },
  { id: 'incidents', label: 'Incidents', icon: '🎭', badge: 3, view: 'incidents' },
  { id: 'connectors', label: 'Connectors', icon: '🔌', view: 'connectors' },
  { id: 'tenants', label: 'Tenants', icon: '🏢', view: 'tenants' },
  { id: 'settings', label: 'Settings', icon: '⚙️', view: 'settings' },
];

interface SidebarProps {
  wsConnected: boolean;
}

export function Sidebar({ wsConnected }: SidebarProps) {
  const { currentView, setCurrentView, tenants } = useAppStore();
  const [socHealth] = useState(73);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">S</span>
          <div className="logo-text">
            <div className="logo-title">SyberOps</div>
            <div className="logo-subtitle">AI-Powered SOC</div>
          </div>
        </div>
      </div>

      {/* Live Status */}
      <div className="sidebar-section">
        <div className="live-status">
          <StatusDot status={wsConnected ? 'connected' : 'disconnected'} animate={wsConnected} />
          <div className="live-text">
            <div className="live-label">{wsConnected ? 'LIVE' : 'RECONNECTING'}</div>
            <div className="live-sublabel">WebSocket {wsConnected ? 'Connected' : 'Offline'}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="sidebar-section">
        <div className="section-label">NAVIGATION</div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${currentView === item.view ? 'active' : ''}`}
              onClick={() => setCurrentView(item.view)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Tenant Selector */}
      <div className="sidebar-section">
        <div className="section-label">TENANT</div>
        <select className="tenant-selector">
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* SOC Health */}
      <div className="sidebar-section">
        <div className="section-label">SOC HEALTH</div>
        <div className="health-card">
          <div className="health-bar-container">
            <div className="health-bar-bg">
              <div className="health-bar-fill" style={{ width: `${socHealth}%` }} />
            </div>
            <span className="health-percent">{socHealth}%</span>
          </div>
          <div className="health-stats">
            <div className="health-stat">
              <span className="stat-label">L1 Coverage</span>
              <span className="stat-value">94%</span>
            </div>
            <div className="health-stat">
              <span className="stat-label">Response SLA</span>
              <span className="stat-value">96%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="footer-text">SyberOps v1.0</div>
      </div>
    </aside>
  );
}
