import { useState, useCallback, useEffect } from 'react';
import { Alert, WSMessage, FilterState, Severity, AlertStatus } from '../types';
import { apiClient } from '../api/client';

// Normalize severity/status casing from WS messages
function normalizeAlert(a: Alert): Alert {
  return {
    ...a,
    severity: (String(a.severity || 'low').toUpperCase()) as Severity,
    status: (String(a.status || 'new').toUpperCase()) as AlertStatus,
  };
}

export function useAlerts(tenantId?: string) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    severity: 'ALL',
    status: 'ALL',
    source: 'ALL',
    searchTerm: '',
  });

  /* Load initial alerts */
  const loadAlerts = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getAlerts(tenantId);
      setAlerts(data);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  /* Handle WebSocket messages — backend sends { type, alert } or { type, alertId, step, stepIndex } */
  const handleWSMessage = useCallback((message: WSMessage) => {
    const msg = message as unknown as Record<string, unknown>;

    if (msg.type === 'new_alert') {
      const newAlert = normalizeAlert(msg.alert as Alert);
      setAlerts((prev) => [newAlert, ...prev]);

    } else if (msg.type === 'alert_updated') {
      const updated = normalizeAlert(msg.alert as Alert);
      setAlerts((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
      if (selectedAlert?.id === updated.id) {
        setSelectedAlert(updated);
      }

    } else if (msg.type === 'triage_progress') {
      // Backend sends individual step + index; accumulate into agentSteps array
      const alertId = msg.alertId as string;
      const step = msg.step as NonNullable<Alert['agentSteps']>[0];
      const stepIndex = msg.stepIndex as number;
      setAlerts((prev) =>
        prev.map((a) => {
          if (a.id !== alertId) return a;
          const steps = [...(a.agentSteps || [])];
          steps[stepIndex] = step;
          return { ...a, agentSteps: steps, status: 'TRIAGING' as AlertStatus };
        })
      );
      if (selectedAlert?.id === alertId) {
        setSelectedAlert((prev) => {
          if (!prev) return null;
          const steps = [...(prev.agentSteps || [])];
          steps[stepIndex] = step;
          return { ...prev, agentSteps: steps };
        });
      }

    } else if (msg.type === 'metrics_update') {
      // metrics handled by useMetrics hook
    }
  }, [selectedAlert?.id]);

  /* Apply filters */
  const getFilteredAlerts = useCallback((): Alert[] => {
    return alerts.filter((alert) => {
      if (filters.severity && filters.severity !== 'ALL' && alert.severity !== filters.severity) {
        return false;
      }
      if (filters.status && filters.status !== 'ALL' && alert.status !== filters.status) {
        return false;
      }
      if (filters.source && filters.source !== 'ALL' && alert.source !== filters.source) {
        return false;
      }
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        return (
          alert.title.toLowerCase().includes(term) ||
          alert.id.toLowerCase().includes(term) ||
          alert.source.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [alerts, filters]);

  /* Statistics */
  const stats = {
    total: alerts.length,
    critical: alerts.filter((a) => a.severity === 'CRITICAL').length,
    high: alerts.filter((a) => a.severity === 'HIGH').length,
    medium: alerts.filter((a) => a.severity === 'MEDIUM').length,
    triaging: alerts.filter((a) => a.status === 'TRIAGING').length,
  };

  /* Imperatively update a single alert in local state (used after manual triage) */
  const updateAlert = useCallback((alertId: string, changes: Partial<Alert>) => {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, ...changes } : a)));
    setSelectedAlert((prev) => (prev?.id === alertId ? { ...prev, ...changes } : prev));
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  return {
    alerts: getFilteredAlerts(),
    allAlerts: alerts,
    isLoading,
    selectedAlert,
    setSelectedAlert,
    filters,
    setFilters,
    handleWSMessage,
    updateAlert,
    stats,
    reload: loadAlerts,
  };
}
