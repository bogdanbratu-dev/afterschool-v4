#!/bin/bash
cd "$(dirname "$0")"

if [ -f .server.pid ]; then
  PID=$(cat .server.pid)
  if kill -0 $PID 2>/dev/null; then
    kill $PID
    rm .server.pid
    echo "Server oprit."
  else
    rm .server.pid
    echo "Serverul nu mai rula."
  fi
else
  # fallback: opreste orice proces pe portul 3000
  PIDS=$(lsof -ti :3000)
  if [ -n "$PIDS" ]; then
    kill $PIDS
    echo "Server oprit."
  else
    echo "Niciun server activ pe portul 3000."
  fi
fi
