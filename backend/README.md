# SyberOps SOC Platform - Backend API

A Node.js/Express REST API and WebSocket server for the SyberOps Security Operations Center (SOC) platform. This backend simulates an AI-powered alert triage system with realistic security alerts and multi-agent processing.

## Features

- **REST API** for alerts, incidents, metrics, connectors, and tenants
- **WebSocket Server** for real-time alert streaming and triage progress updates
- **AI Triage Engine** simulating 8 specialized agents processing security alerts
- **Alert Simulator** generating realistic SOC alerts from 10+ scenarios
- **TypeScript** with strict type safety
- **CORS support** for Vite dev server integration

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Server runs on `http://localhost:3001`
WebSocket at `ws://localhost:3001/ws`

## API Endpoints

### Alerts
- `GET /api/alerts` - List all alerts (with filters: severity, status, source, verdict)
- `GET /api/alerts/:id` - Get alert details
- `PATCH /api/alerts/:id` - Update alert (status, verdict, incidentId)
- `POST /api/alerts/:id/actions/:actionId/execute` - Execute response action

### Incidents
- `GET /api/incidents` - List all incidents
- `GET /api/incidents/:id` - Get incident details

### Metrics
- `GET /api/metrics` - Get SOC metrics (accuracy, MTTD, MTTR, alert counts)

### Connectors
- `GET /api/connectors` - List security tool integrations

### Tenants
- `GET /api/tenants` - List tenant organizations

### Health
- `GET /health` - Server health check

## WebSocket Messages

The server broadcasts real-time updates to connected clients:

```typescript
// New alert detected
{ type: 'new_alert'; alert: Alert }

// Agent completed processing step
{ type: 'triage_progress'; alertId: string; step: AgentStep; stepIndex: number }

// Alert triage complete
{ type: 'alert_updated'; alert: Alert }

// Metrics refreshed every 30 seconds
{ type: 'metrics_update'; metrics: Metrics }

// Client connection established
{ type: 'connected'; message: string }
```

## Architecture

### Services

**alertSimulator.ts** - Generates realistic alerts from 10 scenarios:
- Credential dumping (Mimikatz)
- Brute force attacks
- Impossible travel
- C2 beacons
- MFA bypass
- Ransomware
- Cryptomining
- Lateral movement
- Spearphishing
- Privileged account abuse

**aiTriageEngine.ts** - Simulates 8-agent AI pipeline:
1. AlertIntakeAgent (400-800ms) - Initial classification
2. EnrichmentAgent (800-1500ms) - Asset enrichment
3. ThreatIntelAgent (1000-2000ms) - IOC correlation
4. CorrelationAgent (600-1200ms) - Pattern detection
5. InvestigationAgent (1500-3000ms) - Deep analysis
6. VerdictAgent (500-1000ms) - Final determination
7. ResponseAgent (400-800ms) - Action planning
8. ComplianceAgent (300-600ms) - Regulatory checks

**wsServer.ts** - WebSocket server for real-time updates

### Routes

- `routes/alerts.ts` - Alert CRUD and response actions
- `routes/incidents.ts` - Incident aggregation
- `routes/metrics.ts` - SOC KPI calculations
- `routes/connectors.ts` - Tool integration status
- `routes/tenants.ts` - Tenant organizations

## Data Types

All types are defined in `src/types.ts`:
- Alert, AgentStep, Asset, IOC, MitreTechnique
- ResponseAction, Incident, Connector, Metrics
- Severity, AlertStatus, Verdict enums
- WSMessage union type

## Alert Simulation

Alerts are generated every 8-15 seconds and immediately start the AI triage pipeline. Each alert includes:

- **Realistic assets**: Hostnames, usernames, IPs, domains, processes, files
- **IOCs**: Malicious hashes, IPs, domains from threat intel feeds
- **MITRE techniques**: Mapped to attack tactics
- **Raw payload**: Complete event data for investigation

The triage pipeline takes 8-15+ seconds total, with each agent outputting realistic findings based on the alert scenario.

## Metrics Calculation

The metrics endpoint calculates:
- Alerts today and last hour
- AI accuracy (true positive rate)
- Mean Time To Detect (MTTD)
- Mean Time To Respond (MTTR)
- Alert breakdown by severity
- Verdict distribution

## Environment Variables

- `PORT` (default: 3001) - Server port

## Directory Structure

```
src/
├── index.ts                 # Express server entry point
├── types.ts                 # TypeScript type definitions
├── services/
│   ├── alertSimulator.ts    # Alert generation
│   ├── aiTriageEngine.ts    # AI triage pipeline
│   └── wsServer.ts          # WebSocket server
├── routes/
│   ├── alerts.ts
│   ├── incidents.ts
│   ├── metrics.ts
│   ├── connectors.ts
│   └── tenants.ts
└── middleware/
    └── cors.ts              # CORS configuration
```

## Development

This project uses:
- TypeScript 5.3+
- Express 4.18+
- ws 8.16+ (WebSockets)
- CORS 2.8+

All code is strictly typed and compiled with `noImplicitAny` enabled.

## Production

Build and run:

```bash
npm run build
npm start
```

The compiled JavaScript is output to `dist/`.

---

Built for the SyberOps SOC Platform
