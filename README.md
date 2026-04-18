# SyberOps — AI-Powered SOC Triage Platform

> **Zero Noise. Maximum Speed.**  
> Agentic AI that investigates security alerts like your best L3 analyst — at L1 speed.

---

## 🚀 Quick Start (30 seconds)

### Prerequisites
- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- A terminal / command prompt

### One-command launch

```bash
# From the SyberOps_Platform/ directory:
chmod +x start.sh && ./start.sh
```

Then open **http://localhost:5173** in your browser.

> **Windows users:** Run `start-windows.bat` or follow the Manual Start steps below.

---

## 📋 Manual Start

Open **two terminals**:

**Terminal 1 — Backend API:**
```bash
cd backend
npm install          # First time only
npm run build        # First time only
node dist/index.js
```

**Terminal 2 — Frontend Dashboard:**
```bash
cd frontend
npm install          # First time only
npm run dev
```

Open **http://localhost:5173**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SyberOps Platform                      │
├───────────────────┬─────────────────────────────────────────┤
│  React Dashboard  │           Node.js Backend               │
│  (Port 5173)      │           (Port 3001)                   │
│                   │                                         │
│  • Alert Queue    │  ┌──────────────────────────────────┐  │
│  • AI Pipeline    │  │  AI Triage Engine (8 Agents)      │  │
│  • Incidents      │  │  1. AlertIntakeAgent              │  │
│  • Connectors     │  │  2. EnrichmentAgent               │  │
│  • Metrics        │  │  3. ThreatIntelAgent              │  │
│                   │  │  4. CorrelationAgent              │  │
│  WebSocket ◄──────┼──│  5. InvestigationAgent           │  │
│  (Real-time)      │  │  6. VerdictAgent                  │  │
│                   │  │  7. ResponseAgent                 │  │
│  REST API ◄───────┼──│  8. ComplianceAgent               │  │
│                   │  └──────────────────────────────────┘  │
│                   │                                         │
│                   │  Alert Simulator (10 scenarios)         │
│                   │  → New alert every 8-15 seconds         │
└───────────────────┴─────────────────────────────────────────┘
```

---

## 🎯 What You'll See

| Feature | Details |
|---------|---------|
| **Live Alert Stream** | New security alerts every 8–15 seconds from simulated SIEM/EDR sources |
| **8-Agent AI Pipeline** | Watch each agent analyze the alert in real-time with reasoning |
| **AI Verdicts** | True Positive / False Positive / Suspicious with confidence % |
| **Threat Intel** | IOC enrichment, MITRE ATT&CK mapping, asset risk scoring |
| **Incidents** | Correlated attack chains grouped into incidents |
| **Connector Grid** | 9 security tool integrations with health status |
| **MSSP Tenancy** | Multi-tenant support with tenant switcher |

---

## 🔌 Alert Sources Simulated

| Source | Type | Scenarios |
|--------|------|-----------|
| CrowdStrike Falcon | EDR | Mimikatz, Ransomware, Process injection |
| Splunk SIEM | SIEM | Brute force, Log anomalies |
| Microsoft Sentinel | Cloud SIEM | Impossible travel, Insider threat |
| Palo Alto Networks | Firewall/NGFW | C2 beaconing, Data exfil |
| Okta | Identity | MFA bypass, Account takeover |
| AWS GuardDuty | Cloud | Cryptomining, IAM abuse |
| Elastic SIEM | SIEM | Lateral movement, WMI execution |
| Proofpoint | Email | Spearphishing, Business Email Compromise |
| CyberArk | PAM | Privileged access anomalies |
| Microsoft Defender | Endpoint | Office macro, Script execution |

---

## 🤖 Enabling Real Claude AI

The platform ships with **simulated AI** (no API cost). To use **real Claude API**:

1. Get an API key at [console.anthropic.com](https://console.anthropic.com)
2. Copy `.env.example` to `.env`
3. Set `ANTHROPIC_API_KEY=your_key_here`
4. The backend will automatically use real Claude for triage reasoning

---

## 📡 API Endpoints

```
GET  /health                    Server health check
GET  /api/alerts                List alerts (filter by severity, status, source)
GET  /api/alerts/:id            Get alert detail with full AI reasoning
PATCH /api/alerts/:id           Update alert status
GET  /api/incidents             List correlated incidents
GET  /api/metrics               SOC KPIs (MTTD, MTTR, accuracy)
GET  /api/connectors            Integration health status
GET  /api/tenants               MSSP tenant list
```

---

## 📁 Project Structure

```
SyberOps_Platform/
├── start.sh                    ← Quick launch script
├── .env.example                ← Environment config template
├── README.md                   ← This file
│
├── backend/                    ← Node.js + TypeScript API
│   ├── src/
│   │   ├── index.ts            ← Server entry + alert simulation loop
│   │   ├── types.ts            ← Core data types
│   │   ├── services/
│   │   │   ├── aiTriageEngine.ts    ← 8-agent AI pipeline
│   │   │   ├── alertSimulator.ts    ← Realistic alert generator
│   │   │   └── wsServer.ts          ← WebSocket real-time server
│   │   └── routes/             ← REST API routes
│   └── dist/                   ← Compiled JavaScript (run this)
│
└── frontend/                   ← React + TypeScript dashboard
    ├── src/
    │   ├── App.tsx             ← Root component
    │   ├── types.ts            ← Frontend types
    │   ├── api/client.ts       ← API fetch wrapper
    │   ├── hooks/              ← useAlerts, useWebSocket, useMetrics
    │   └── components/
    │       ├── layout/         ← Sidebar, TopBar, MainLayout
    │       ├── alerts/         ← AlertQueue, AlertRow, AlertDetail
    │       ├── ai/             ← AgentPipeline, ConfidenceRing, VerdictBadge
    │       ├── dashboard/      ← MetricsBar, LiveFeed, SeverityChart
    │       ├── incidents/      ← IncidentPanel
    │       ├── connectors/     ← ConnectorStatus
    │       └── common/         ← Shared UI components
    └── dist/                   ← Production build
```

---

## 🛠️ Development

```bash
# Watch mode — auto-restart on file changes
cd backend && npm run dev     # Uses ts-node-dev

# Frontend hot reload
cd frontend && npm run dev    # Vite HMR
```

---

## 📈 Performance Targets

| Metric | Target | Simulated Value |
|--------|--------|-----------------|
| Alert → AI Verdict | < 30 seconds | 8–15 seconds |
| False Positive Rate | < 5% | ~12% (realistic) |
| AI Accuracy | > 95% | ~88% |
| Alert Throughput | 10,000+/min | Simulated |

---

*Built with Claude (Anthropic) · React · Node.js · TypeScript*
