import { createContext, useContext } from 'react';
import { Tenant } from '../types';

export interface AppContextType {
  currentTenant: Tenant | null;
  setCurrentTenant: (tenant: Tenant) => void;
  tenants: Tenant[];
  setTenants: (tenants: Tenant[]) => void;
  currentView: 'dashboard' | 'alerts' | 'investigations' | 'incidents' | 'connectors' | 'tenants' | 'settings';
  setCurrentView: (view: AppContextType['currentView']) => void;
  autoRefreshEnabled: boolean;
  setAutoRefreshEnabled: (enabled: boolean) => void;
  /** When true, triage uses the fast simulation engine.
   *  When false, clicking "Run AI Triage" calls real Claude agents. */
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  /** Set by the backend /api/ai-status check */
  hasRealAI: boolean;
  setHasRealAI: (v: boolean) => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export function useAppStore(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within AppProvider');
  }
  return context;
}
