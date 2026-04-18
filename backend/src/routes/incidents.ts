import { Router, Request, Response } from 'express';
import { Alert, Incident } from '../types';

export function createIncidentsRouter(alerts: Alert[]) {
  const router = Router();

  router.get('/', (req: Request, res: Response): void => {
    const incidentMap = new Map<string, Incident>();

    alerts.forEach((alert) => {
      if (alert.incidentId && !incidentMap.has(alert.incidentId)) {
        const incident: Incident = {
          id: alert.incidentId,
          title: alert.title,
          severity: alert.severity,
          status: 'investigating',
          alertIds: [alert.id],
          tenantId: alert.tenantId,
          createdAt: alert.timestamp,
          attackChain: alert.mitreTechniques,
          summary: alert.description,
        };
        incidentMap.set(alert.incidentId, incident);
      } else if (alert.incidentId) {
        const incident = incidentMap.get(alert.incidentId);
        if (incident) {
          incident.alertIds.push(alert.id);
        }
      }
    });

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const incidents = Array.from(incidentMap.values());
    const total = incidents.length;
    const paginated = incidents.slice(offset, offset + limit);

    res.json({
      data: paginated,
      total,
      limit,
      offset,
    });
  });

  router.get('/:id', (req: Request, res: Response): void => {
    const relatedAlerts = alerts.filter((a) => a.incidentId === req.params.id);

    if (relatedAlerts.length === 0) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    const firstAlert = relatedAlerts[0];
    const incident: Incident = {
      id: req.params.id,
      title: firstAlert.title,
      severity: firstAlert.severity,
      status: 'investigating',
      alertIds: relatedAlerts.map((a) => a.id),
      tenantId: firstAlert.tenantId,
      createdAt: firstAlert.timestamp,
      attackChain: firstAlert.mitreTechniques,
      summary: firstAlert.description,
    };

    res.json(incident);
  });

  return router;
}
