import { Router, Request, Response } from 'express';
import { Connector, Alert } from '../types';

export function createConnectorsRouter(alerts: Alert[]) {
  const router = Router();

  router.get("/", (_req: Request, res: Response): void => {
    const connectors = getConnectors(alerts);
    res.json(connectors);
  });

  return router;
}

function getConnectors(alerts: Alert[]): Connector[] {
  const sources = new Set<string>();
  const sourceData = new Map<string, { icon: string; count: number; lastAlert: string }>();

  alerts.forEach((alert) => {
    sources.add(alert.source);
    if (!sourceData.has(alert.source)) {
      sourceData.set(alert.source, {
        icon: alert.sourceIcon,
        count: 0,
        lastAlert: alert.timestamp,
      });
    }
    const data = sourceData.get(alert.source);
    if (data) {
      data.count++;
      if (new Date(alert.timestamp) > new Date(data.lastAlert)) {
        data.lastAlert = alert.timestamp;
      }
    }
  });

  const connectors: Connector[] = Array.from(sourceData.entries()).map(([name, data]) => ({
    id: `connector-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    type: getConnectorType(name),
    icon: data.icon,
    status: Math.random() > 0.1 ? 'connected' : 'degraded',
    alertsToday: data.count,
    lastAlertAt: data.lastAlert,
    latencyMs: Math.floor(Math.random() * 200) + 50,
  }));

  return connectors.sort((a, b) => b.alertsToday - a.alertsToday);
}

function getConnectorType(sourceName: string): string {
  const typeMap: Record<string, string> = {
    'CrowdStrike Falcon': 'EDR',
    'Splunk SIEM': 'SIEM',
    'Microsoft Sentinel': 'SIEM',
    'Palo Alto Networks': 'Network',
    Okta: 'IAM',
    'AWS GuardDuty': 'Cloud',
    'Elastic SIEM': 'SIEM',
    Proofpoint: 'Email',
    CyberArk: 'PAM',
  };
  return typeMap[sourceName] || 'Security Tool';
}
