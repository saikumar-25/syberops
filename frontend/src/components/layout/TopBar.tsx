import { useAppStore } from '../../store/appStore';
import './TopBar.css';

interface TopBarProps {
  title: string;
  alertStats?: {
    critical: number;
    high: number;
  };
}

export function TopBar({ title, alertStats }: TopBarProps) {
  const { demoMode, setDemoMode, hasRealAI } = useAppStore();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div className="topbar-center">
        {alertStats && (
          <div className="alert-stats">
            <div className="stat-item critical">
              <span className="dot">🔴</span>
              <span className="count">{alertStats.critical}</span>
              <span className="label">Critical</span>
            </div>
            <div className="stat-item high">
              <span className="dot">🟡</span>
              <span className="count">{alertStats.high}</span>
              <span className="label">High</span>
            </div>
          </div>
        )}
      </div>

      <div className="topbar-right">
        {/* Demo Mode toggle */}
        <div className="demo-mode-toggle" title={hasRealAI ? 'Toggle between real Claude AI and simulation' : 'Add ANTHROPIC_API_KEY to backend to enable real AI'}>
          <span className="demo-mode-label">
            {demoMode ? '🔄 Demo Mode' : '🤖 AI Mode'}
          </span>
          <button
            className={`toggle-switch ${!demoMode ? 'active' : ''} ${!hasRealAI ? 'disabled' : ''}`}
            onClick={() => hasRealAI && setDemoMode(!demoMode)}
            title={hasRealAI ? 'Switch mode' : 'No Claude API key detected'}
          >
            <span className="toggle-thumb" />
          </button>
          {hasRealAI && (
            <span className="ai-badge">Claude</span>
          )}
        </div>

        <button className="icon-button">
          <span>🔍</span>
        </button>
        <button className="icon-button">
          <span>🔔</span>
        </button>
        <button className="icon-button">
          <span>👤</span>
        </button>
      </div>
    </header>
  );
}
