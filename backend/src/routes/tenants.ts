import { Router, Request, Response } from 'express';
import { Alert } from '../types';

interface Tenant {
  id: string;
  name: string;
  alertCount: number;
  criticalCount: number;
  status: 'active' | 'inactive';
}

export function createTenantsRouter(alerts: Alert[]) {
  const router = Router();

  router.get("/", (_req: Request, res: Response): void => {
    const tenants = getTenants(alerts);
    res.json(tenants);
  });

  return router;
}

function getTenants(alerts: Alert[]): Tenant[] {
  const tenantMap = new Map<string, { alertCount: number; criticalCount: number }>();

  alerts.forEach((alert) => {
    if (!tenantMap.has(alert.tenantId)) {
      tenantMap.set(alert.tenantId, { alertCount: 0, criticalCount: 0 });
    }

    const data = tenantMap.get(alert.tenantId);
    if (data) {
      data.alertCount++;
      if (alert.severity === 'critical') {
        data.criticalCount++;
      }
    }
  });

  const tenants: Tenant[] = Array.from(tenantMap.entries()).map(([id, data]) => ({
    id,
    name: getTenantName(id),
    alertCount: data.alertCount,
    criticalCount: data.criticalCount,
    status: 'active',
  }));

  return tenants;
}

function getTenantName(tenantId: string): string {
  const nameMap: Record<string, string> = {
    'tenant-1': 'Acme Corp',
    'tenant-2': 'TechFlow Industries',
    'tenant-3': 'Global Finance Inc',
  };
  return nameMap[tenantId] || tenantId;
}
