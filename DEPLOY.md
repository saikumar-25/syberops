# SyberOps — Deployment Guide
### Vercel (Frontend) + Railway (Backend) → syberops.com

---

## Overview

| Layer | Service | URL |
|-------|---------|-----|
| Frontend (React) | Vercel | syberops.com |
| Backend (Node.js + WS) | Railway | syberops-api.up.railway.app |
| AI Engine | Anthropic Claude | via API key |

---

## Step 1 — Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Select your repo and pick the **`SyberOps_Platform/backend`** folder as the root
3. Railway auto-detects `railway.toml` and builds with Nixpacks

### Set these Environment Variables in Railway:

| Variable | Value |
|----------|-------|
| `PORT` | (auto-set by Railway) |
| `ANTHROPIC_API_KEY` | `sk-ant-...` (from console.anthropic.com) |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5-20251001` |
| `CORS_ORIGIN` | `https://syberops.com,https://www.syberops.com` |

4. Click **Deploy** — Railway will build and start the backend
5. Copy the generated URL, e.g. `https://syberops-api.up.railway.app`
6. Verify: open `https://syberops-api.up.railway.app/health` — should return JSON

---

## Step 2 — Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → Import your GitHub repo
2. Set **Root Directory** to `SyberOps_Platform/frontend`
3. Framework: **Vite** (auto-detected)

### Set these Environment Variables in Vercel:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://syberops-api.up.railway.app` |
| `VITE_WS_URL` | `wss://syberops-api.up.railway.app` |

4. Click **Deploy** — Vercel builds and serves the React app
5. You'll get a URL like `https://syberops-dashboard.vercel.app`

---

## Step 3 — Connect syberops.com

### Option A — Point domain to Vercel (recommended)

In your domain registrar (e.g. Namecheap, GoDaddy):

```
Type    Name    Value
A       @       76.76.21.21        (Vercel's IP)
CNAME   www     cname.vercel-dns.com
```

Then in Vercel project → **Settings → Domains** → Add `syberops.com` and `www.syberops.com`

### Option B — Use Vercel's nameservers

Vercel can manage your DNS entirely — follow their "Add Domain" wizard which gives you nameserver records to set at your registrar.

---

## Step 4 — Test the Full Stack

```bash
# Backend health
curl https://syberops-api.up.railway.app/health

# AI status (shows if Claude API key is active)
curl https://syberops-api.up.railway.app/api/ai-status

# Open in browser
open https://syberops.com
```

Expected `/api/ai-status` response when key is set:
```json
{ "realAI": true, "model": "claude-haiku-4-5-20251001" }
```

---

## How Demo Mode Works

In the top bar of SyberOps you'll see a **Demo Mode** toggle:

| Toggle | Behaviour |
|--------|-----------|
| 🔄 Demo Mode ON | Background simulation engine runs — fast, no API cost |
| 🤖 AI Mode ON | Click "Run AI Triage" on any alert → real Claude agents analyse it |

The toggle is disabled (greyed out) if no `ANTHROPIC_API_KEY` is set on the backend.

---

## Local Development (no deployment needed)

```bash
cd SyberOps_Platform

# Terminal 1 — backend
cd backend
cp .env.example .env        # add your ANTHROPIC_API_KEY
npm install && npm run build && node dist/index.js

# Terminal 2 — frontend
cd frontend
npm install && npm run dev
```

Open http://localhost:5173

Or use the convenience script from the platform root:
```bash
./start.sh
```

---

## Costs

| Service | Cost |
|---------|------|
| Vercel (frontend) | Free (Hobby plan) |
| Railway (backend) | Free $5/mo credit → ~$0 for light usage |
| Anthropic API | ~$0.001 per alert triage with claude-haiku-4-5-20251001 |

For a demo with ~50 manual triages: **< $0.05 in API costs**.
