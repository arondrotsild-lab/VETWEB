#!/bin/bash
set -e

cd "$(dirname "$0")"

if [ "${NODE_ENV:-}" = "production" ]; then
  cd server
  exec node dist/index.js
fi

# Development: start the API and Vite dev server.
(
  cd server
  ./node_modules/.bin/tsc
)
PORT=3001 node server/dist/index.js &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

# Start frontend
cd client
./node_modules/.bin/vite --port "${PORT:-5000}" --host 0.0.0.0
