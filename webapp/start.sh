#!/bin/bash

echo "🚀 Starting servers..."

# Kill any existing processes
pkill -f "vite" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true

sleep 2

# Start backend
echo "📊 Starting backend server..."
node server/index.js &
SERVER_PID=$!

sleep 3

# Start frontend
echo "🌐 Starting frontend server..."
npx vite --host 0.0.0.0 --port 3000 &
CLIENT_PID=$!

echo ""
echo "✅ Servers started!"
echo "📊 Backend: http://localhost:3001"
echo "🌐 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop"

# Wait for interrupt
trap 'kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit' INT
wait