import { Alert, Metrics, Incident, Connector, Tenant, Severity, AlertStatus } from '../types';

// Normalize alert data from backend (backend uses lowercase, frontend uses uppercase)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeAlert(a: any): Alert {
  return {
    ...a,
    severity: (String(a.severity || 'low').toUpperCase()) as Severity,
    status: (String(a.status || 'new').toUpperCase()) as AlertStatus,
    verdict: a.verdict
      ? ((a.verdict as string).toUpperCase().replace(/-/g, '_'))
      : undefined,
  } as Alert;
}

// In production VITE_API_URL = "https://syberops-api.up.railway.app" (no trailing slash)
// In dev the Vite proxy rewrites /api → http://localhost:3001/api automatically
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

class APIClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  /* Alerts */
  async getAlerts(tenantId?: string): Promise<Alert[]> {
    const params = tenantId ? `?tenant=${tenantId}&limit=100` : '?limit=100';
    const res = await this.request<PaginatedResponse<Alert> | Alert[]>(`/alerts${params}`);
    const raw = Array.isArray(res)
      ? res
      : (res && typeof res === 'object' && 'data' in res ? (res as PaginatedResponse<Alert>).data : []);
    return raw.map(normalizeAlert);
  }

  async getAlert(alertId: string): Promise<Alert> {
    return this.request(`/alerts/${alertId}`);
  }

  async updateAlertStatus(alertId: string, status: string): Promise<Alert> {
    return this.request(`/alerts/${alertId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  /** Trigger real Claude AI triage for a specific alert */
  async triageAlert(alertId: string): Promise<{ message: string; alertId: string; realAI: boolean }> {
    return this.request(`/alerts/${alertId}/triage`, { method: 'POST' });
  }

  /** Check whether the backend has a real Claude API key */
  async getAIStatus(): Promise<{ realAI: boolean; model: string }> {
    return this.request('/ai-status');
  }

  /* Metrics */
  async getMetrics(tenantId?: string): Promise<Metrics> {
    const params = tenantId ? `?tenant=${tenantId}` : '';
    return this.request(`/metrics${params}`);
  }

  /* Incidents */
  async getIncidents(tenantId?: string): Promise<Incident[]> {
    const params = tenantId ? `?tenant=${tenantId}` : '';
    const res = await this.request<PaginatedResponse<Incident> | Incident[]>(`/incidents${params}`);
    if (Array.isArray(res)) return res;
    if (res && typeof res === 'object' && 'data' in res) return (res as PaginatedResponse<Incident>).data;
    return [];
  }

  async getIncident(incidentId: string): Promise<Incident> {
    return this.request(`/incidents/${incidentId}`);
  }

  /* Connectors */
  async getConnectors(tenantId?: string): Promise<Connector[]> {
    const params = tenantId ? `?tenant=${tenantId}` : '';
    return this.request(`/connectors${params}`);
  }

  /* Tenants */
  async getTenants(): Promise<Tenant[]> {
    return this.request('/tenants');
  }

  async getTenant(tenantId: string): Promise<Tenant> {
    return this.request(`/tenants/${tenantId}`);
  }
}

export const apiClient = new APIClient();
