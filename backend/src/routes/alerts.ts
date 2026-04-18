import { Router, Request, Response } from 'express';
import { Alert, AlertStatus, Verdict } from '../types';

export function createAlertsRouter(alerts: Alert[]) {
  const router = Router();

  router.get('/', (req: Request, res: Response): void => {
    let filtered = [...alerts];

    const severity = req.query.severity as string | undefined;
    if (severity) {
      filtered = filtered.filter((a) => a.severity === severity);
    }

    const status = req.query.status as string | undefined;
    if (status) {
      filtered = filtered.filter((a) => a.status === status);
    }

    const source = req.query.source as string | undefined;
    if (source) {
      filtered = filtered.filter((a) => a.source === source);
    }

    const verdict = req.query.verdict as string | undefined;
    if (verdict) {
      filtered = filtered.filter((a) => a.verdict === verdict);
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    res.json({
      data: paginated,
      total,
      limit,
      offset,
    });
  });

  router.get('/:id', (req: Request, res: Response): void => {
    const alert = alerts.find((a) => a.id === req.params.id);

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    res.json(alert);
  });

  router.patch('/:id', (req: Request, res: Response): void => {
    const alert = alerts.find((a) => a.id === req.params.id);

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    const { status, verdict, incidentId } = req.body;

    if (status && isValidStatus(status)) {
      alert.status = status;
    }

    if (verdict && isValidVerdict(verdict)) {
      alert.verdict = verdict;
    }

    if (incidentId) {
      alert.incidentId = incidentId;
    }

    res.json(alert);
  });

  router.post('/:id/actions/:actionId/execute', (req: Request, res: Response): void => {
    const alert = alerts.find((a) => a.id === req.params.id);

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    const action = alert.responseActions.find((a) => a.id === req.params.actionId);

    if (!action) {
      res.status(404).json({ error: 'Action not found' });
      return;
    }

    action.status = 'executed';

    res.json({
      message: `Action ${action.label} executed successfully`,
      action,
    });
  });

  return router;
}

function isValidStatus(status: string): status is AlertStatus {
  const validStatuses: AlertStatus[] = ['new', 'triaging', 'triaged', 'escalated', 'closed', 'false_positive'];
  return validStatuses.includes(status as AlertStatus);
}

function isValidVerdict(verdict: string): verdict is Verdict {
  const validVerdicts: Verdict[] = ['true_positive', 'false_positive', 'suspicious', 'benign', 'pending'];
  return validVerdicts.includes(verdict as Verdict);
}
