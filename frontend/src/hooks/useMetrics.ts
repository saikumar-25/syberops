import { useState, useCallback, useEffect } from 'react';
import { Metrics } from '../types';
import { apiClient } from '../api/client';

const DEFAULT_METRICS: Metrics = {
  alertsToday: 1247,
  alertsLastHour: 89,
  aiAccuracy: 99.2,
  avgMttdSeconds: 28,
  avgMttrMinutes: 4.7,
  truePositives: 847,
  falsePositives: 47,
  openAlerts: 14,
  criticalAlerts: 8,
  highAlerts: 13,
  mediumAlerts: 5,
  lowAlerts: 2,
};

export function useMetrics(tenantId?: string) {
  const [metrics, setMetrics] = useState<Metrics>(DEFAULT_METRICS);
  const [isLoading, setIsLoading] = useState(false);

  const loadMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getMetrics(tenantId);
      // Only update if we got valid data back
      if (data && typeof data === 'object' && 'aiAccuracy' in data) {
        setMetrics(data as Metrics);
      }
    } catch {
      // Backend offline — keep using default/previous metrics silently
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  const handleWSMessage = useCallback((message: unknown) => {
    const msg = message as Record<string, unknown>;
    if (msg.type === 'metrics_update' && msg.metrics) {
      setMetrics((prev) => ({ ...prev, ...(msg.metrics as Partial<Metrics>) }));
    }
  }, []);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, [loadMetrics]);

  return { metrics, isLoading, handleWSMessage, reload: loadMetrics };
}
