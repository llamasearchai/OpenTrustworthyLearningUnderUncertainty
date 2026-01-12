#!/bin/bash

# Start Development Servers Script
# Starts both backend and frontend servers on free ports

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Starting OpenTLU Development Servers..."
echo ""

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    echo "Servers stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend server
echo "Starting backend server..."
cd "$PROJECT_ROOT"
PYTHONPATH=src python3 -m opentlu.server &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend server
echo "Starting frontend server..."
cd "$PROJECT_ROOT/frontend"
pnpm dev &
FRONTEND_PID=$!

echo ""
echo "Servers starting..."
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
