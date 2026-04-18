import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import './MainLayout.css';

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  wsConnected: boolean;
  alertStats?: {
    critical: number;
    high: number;
  };
}

export function MainLayout({ children, title, wsConnected, alertStats }: MainLayoutProps) {
  return (
    <div className="main-layout">
      <Sidebar wsConnected={wsConnected} />
      <div className="layout-main">
        <TopBar title={title} alertStats={alertStats} />
        <div className="layout-content">{children}</div>
      </div>
    </div>
  );
}
