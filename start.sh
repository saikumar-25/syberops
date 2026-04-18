#!/bin/bash
# ╔══════════════════════════════════════════════════════════╗
# ║          SyberOps — Quick Start Script                ║
# ╚══════════════════════════════════════════════════════════╝

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_DIR="$SCRIPT_DIR/backend"

echo -e "${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║       SyberOps — AI-Powered SOC Triage Platform      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Check Node.js ─────────────────────────────────────────
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found. Install Node.js 18+ from https://nodejs.org${NC}"
    exit 1
fi
NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
    echo -e "${RED}✗ Node.js 18+ required (found v$(node -v)). Please upgrade.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# ── Detect platform ────────────────────────────────────────
PLATFORM="$(uname -s)"
ARCH="$(uname -m)"
echo -e "${GREEN}✓ Platform: ${PLATFORM} (${ARCH})${NC}"

# ── Smart dependency installer ─────────────────────────────
# Checks if node_modules exists AND was built for the current platform.
# Reinstalls automatically if there's a platform mismatch (common when
# node_modules was created on Linux/CI but running on macOS Apple Silicon).

install_if_needed() {
    local dir="$1"
    local label="$2"
    local needs_install=false

    if [ ! -d "$dir/node_modules" ]; then
        needs_install=true
        echo -e "${YELLOW}→ ${label}: no node_modules found, installing...${NC}"
    else
        # Check for platform mismatch: look for the rollup native binary
        # that matches the current platform. If missing, reinstall.
        if [ "$PLATFORM" = "Darwin" ] && [ "$ARCH" = "arm64" ]; then
            if [ ! -d "$dir/node_modules/@rollup/rollup-darwin-arm64" ] && \
               [ -d "$dir/node_modules/rollup" ]; then
                needs_install=true
                echo -e "${YELLOW}→ ${label}: platform mismatch detected (Linux → macOS ARM64), reinstalling...${NC}"
            fi
        elif [ "$PLATFORM" = "Darwin" ] && [ "$ARCH" = "x86_64" ]; then
            if [ ! -d "$dir/node_modules/@rollup/rollup-darwin-x64" ] && \
               [ -d "$dir/node_modules/rollup" ]; then
                needs_install=true
                echo -e "${YELLOW}→ ${label}: platform mismatch detected (Linux → macOS x64), reinstalling...${NC}"
            fi
        fi
    fi

    if [ "$needs_install" = true ]; then
        # Remove stale node_modules and lock file, then reinstall fresh
        rm -rf "$dir/node_modules" "$dir/package-lock.json"
        cd "$dir"
        npm install --loglevel=error
        echo -e "${GREEN}✓ ${label}: dependencies installed${NC}"
    else
        echo -e "${GREEN}✓ ${label}: dependencies ready${NC}"
    fi
}

install_if_needed "$BACKEND_DIR"  "Backend "
install_if_needed "$FRONTEND_DIR" "Frontend"

# ── Build backend if dist is missing ──────────────────────
if [ ! -d "$BACKEND_DIR/dist" ] || [ ! -f "$BACKEND_DIR/dist/index.js" ]; then
    echo -e "${YELLOW}→ Building backend...${NC}"
    cd "$BACKEND_DIR" && npm run build
    echo -e "${GREEN}✓ Backend built${NC}"
fi

# ── Kill anything on our ports ────────────────────────────
kill_port() {
    local port=$1
    local pids
    pids=$(lsof -ti:"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
}
kill_port 3001
kill_port 5173
sleep 0.5

echo ""
echo -e "${CYAN}${BOLD}Starting SyberOps...${NC}"
echo ""

# ── Start backend ─────────────────────────────────────────
cd "$BACKEND_DIR"
node dist/index.js &
BACKEND_PID=$!
sleep 2

# Verify it started
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}✗ Backend failed to start. Check logs above.${NC}"
    exit 1
fi

# Quick health check
if command -v curl &>/dev/null; then
    HEALTH=$(curl -sf http://localhost:3001/health 2>/dev/null || echo "")
    if [ -n "$HEALTH" ]; then
        echo -e "${GREEN}✓ Backend API running  →  ${CYAN}http://localhost:3001${NC}"
    else
        echo -e "${GREEN}✓ Backend starting up  →  ${CYAN}http://localhost:3001${NC}"
    fi
else
    echo -e "${GREEN}✓ Backend started  →  ${CYAN}http://localhost:3001${NC}"
fi

# ── Start frontend ────────────────────────────────────────
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

sleep 2
echo -e "${GREEN}✓ Frontend dev server  →  ${CYAN}http://localhost:5173${NC}"

echo ""
echo -e "${YELLOW}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${BOLD}  ✅  SyberOps is live!${NC}"
echo -e "${YELLOW}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  🌐 Dashboard →  ${CYAN}${BOLD}http://localhost:5173${NC}"
echo -e "  🔌 API       →  ${CYAN}http://localhost:3001${NC}"
echo -e "  ❤️  Health    →  ${CYAN}http://localhost:3001/health${NC}"
echo ""
echo -e "  New security alerts stream every ${BOLD}8–15 seconds${NC}."
echo -e "  Each alert is auto-triaged by ${BOLD}8 AI agents${NC} in real-time."
echo ""
echo -e "${YELLOW}  Press ${BOLD}Ctrl+C${NC}${YELLOW} to stop all services.${NC}"
echo ""

# ── Wait and clean up on exit ─────────────────────────────
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down SyberOps...${NC}"
    kill $BACKEND_PID  2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    # Also kill any children (e.g. vite sub-processes)
    pkill -P $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}Done. Goodbye.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

wait
