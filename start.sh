#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "🚀 AutoPilot AI Trading Platform - Starting System"
echo "=========================================================="

# Determine project directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Ensure Python virtual environment exists
if [ ! -d "backend/.venv" ]; then
    echo "Creating backend virtual environment..."
    python3 -m venv backend/.venv
    backend/.venv/bin/pip install --upgrade pip
    backend/.venv/bin/pip install -r backend/requirements.txt
fi

# Ensure frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm --prefix frontend install
fi

# Clean up any stale processes on ports 8000 or 5173
lsof -ti :8000 | xargs kill -9 2>/dev/null || true
lsof -ti :5173 | xargs kill -9 2>/dev/null || true

# Build frontend production bundle for optimal performance & minimal CPU/heat
echo "⚡ Building frontend production bundle (low CPU/heat)..."
npm --prefix frontend run build

# Start backend server in the background
echo "⚡ Starting Python FastAPI Backend on http://127.0.0.1:8000 ..."
backend/.venv/bin/python backend/run.py &
BACKEND_PID=$!

# Cleanup handler on exit or Ctrl+C
cleanup() {
    echo ""
    echo "Shutting down AutoPilot AI Trading Platform..."
    kill $BACKEND_PID 2>/dev/null || true
    lsof -ti :5173 | xargs kill -9 2>/dev/null || true
    exit 0
}
trap cleanup INT TERM EXIT

# Wait up to 10 seconds for backend to become healthy
echo "Waiting for backend services to initialize..."
for i in {1..10}; do
    if curl -s http://127.0.0.1:8000/api/health > /dev/null; then
        echo "✅ Backend Engine is active and healthy!"
        break
    fi
    sleep 1
done

echo ""
echo "=========================================================="
echo "🌐 FRONTEND URL: http://localhost:5173"
echo "👤 DEMO ACCOUNT: demo@autopilot.ai (Password: demo1234)"
echo "💰 VIRTUAL CAPITAL: INR 100.00"
echo "🟢 MODE: Strict Paper Trading (Zero Real Money)"
echo "🚀 SERVED VIA: Vite Production Preview (Ultra-Low Heat/CPU)"
echo "🛑 Press Ctrl + C to stop all servers."
echo "=========================================================="
echo ""

# Start frontend in Vite preview mode (low resource consumption)
npx --prefix frontend vite preview --host --port 5173
