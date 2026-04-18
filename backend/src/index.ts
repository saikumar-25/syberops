import 'dotenv/config';   // ← loads .env before anything else
import express, { Express, Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer } from './services/wsServer';
import { AlertSimulator } from './services/alertSimulator';
import { AgentOrchestrator } from './services/agentOrchestrator';
import { createAlertsRouter } from './routes/alerts';
import { createIncidentsRouter } from './routes/incidents';
import { createMetricsRouter, calculateMetrics } from './routes/metrics';
import { createConnectorsRouter } from './routes/connectors';
import { createTenantsRouter } from './routes/tenants';
import { Alert, WSMessage } from './types';

const app: Express = express();
const server = http.createServer(app);
const wss = new WebSocketServer(server);
const simulator = new AlertSimulator();
const orchestrator = new AgentOrchestrator();

/* ── CORS ─────────────────────────────────────────────────────── */
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, Postman, Railway health checks)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return cb(null, true);
      }
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json());

/* ── Alert store ──────────────────────────────────────────────── */
let alerts: Alert[] = simulator.generateInitialAlerts(25);
let alertCounter = 4821;

/* ── Routes ───────────────────────────────────────────────────── */
app.use('/api/alerts', createAlertsRouter(alerts));
app.use('/api/incidents', createIncidentsRouter(alerts));
app.use('/api/metrics', createMetricsRouter(alerts));
app.use('/api/connectors', createConnectorsRouter(alerts));
app.use('/api/tenants', createTenantsRouter(alerts));

/* ── Manual AI triage endpoint ────────────────────────────────── */
app.post('/api/alerts/:id/triage', async (req: Request, res: Response): Promise<void> => {
  const alert = alerts.find((a) => a.id === req.params.id);
  if (!alert) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }

  // Reset triage state
  alert.status = 'triaging';
  alert.triageStartedAt = new Date().toISOString();
  alert.agentSteps = [];
  alert.verdict = 'pending';

  // Respond immediately so the UI can start polling WS
  res.json({
    message: 'Triage started',
    alertId: alert.id,
    realAI: orchestrator.hasRealAI,
  });

  // Run triage asynchronously, streaming progress via WebSocket
  try {
    await orchestrator.triageAlert(alert, (step, stepIndex) => {
      const progressMsg: WSMessage = {
        type: 'triage_progress',
        alertId: alert.id,
        step,
        stepIndex,
      };
      wss.broadcast(progressMsg);
    });

    const updateMsg: WSMessage = {
      type: 'alert_updated',
      alert,
    };
    wss.broadcast(updateMsg);

    console.log(
      `[MANUAL TRIAGE] ${alert.id}: ${alert.verdict} (${Math.round(alert.confidence ?? 0)}%) ${orchestrator.hasRealAI ? '[Claude AI]' : '[Simulation]'}`,
    );
  } catch (err) {
    console.error('[ERROR] Manual triage failed:', err);
  }
});

/* ── AI status endpoint ───────────────────────────────────────── */
app.get('/api/ai-status', (_req: Request, res: Response): void => {
  res.json({
    realAI: orchestrator.hasRealAI,
    model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
  });
});

/* ── Health check ─────────────────────────────────────────────── */
app.get('/health', (_req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    alerts: alerts.length,
    wsClients: wss.getClientCount(),
    realAI: orchestrator.hasRealAI,
  });
});

/* ── Error handlers ───────────────────────────────────────────── */
process.on('uncaughtException', (error: Error) => {
  console.error('[ERROR] Uncaught exception:', error.message);
});
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[ERROR] Unhandled rejection:', reason);
});

/* ── Background alert simulation ─────────────────────────────── */
function startAlertSimulation(): void {
  function scheduleNextAlert(): void {
    const delay = 8000 + Math.random() * 7000;

    setTimeout(async () => {
      try {
        const newAlert = simulator.generateAlert('tenant-1');
        newAlert.id = `ALT-${alertCounter++}`;
        alerts.unshift(newAlert);
        if (alerts.length > 500) alerts = alerts.slice(0, 500);

        wss.broadcast({ type: 'new_alert', alert: newAlert } as WSMessage);
        console.log(`[SIM] ${newAlert.id}: ${newAlert.title}`);

        newAlert.status = 'triaging';
        newAlert.triageStartedAt = new Date().toISOString();

        await orchestrator.triageAlert(newAlert, (step, stepIndex) => {
          wss.broadcast({
            type: 'triage_progress',
            alertId: newAlert.id,
            step,
            stepIndex,
          } as WSMessage);
        });

        wss.broadcast({ type: 'alert_updated', alert: newAlert } as WSMessage);
        console.log(`[TRIAGE] ${newAlert.id}: ${newAlert.verdict} (${Math.round(newAlert.confidence ?? 0)}%)`);

        scheduleNextAlert();
      } catch (err) {
        console.error('[ERROR] Simulation error:', err);
        scheduleNextAlert();
      }
    }, delay);
  }

  scheduleNextAlert();

  // Broadcast metrics every 30 s
  setInterval(() => {
    try {
      wss.broadcast({
        type: 'metrics_update',
        metrics: calculateMetrics(alerts),
      } as WSMessage);
    } catch (err) {
      console.error('[ERROR] Metrics error:', err);
    }
  }, 30000);
}

/* ── Start server ─────────────────────────────────────────────── */
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           SyberOps SOC Platform - Backend API              ║
╚════════════════════════════════════════════════════════════╝

🚀  Server   → http://localhost:${PORT}
📊  WebSocket → ws://localhost:${PORT}/ws
🤖  AI Mode  → ${orchestrator.hasRealAI ? 'Real Claude Agents ✅' : 'Simulation Engine 🔄'}
🔗  Endpoints:
    GET  /api/alerts          GET  /api/metrics
    POST /api/alerts/:id/triage  GET  /api/incidents
    GET  /api/connectors      GET  /api/tenants
    GET  /api/ai-status       GET  /health

⚡  Starting alert simulation…
  `);

  startAlertSimulation();
});

export { app, server, wss };
