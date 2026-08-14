#!/bin/bash
set -e
cd "$(dirname "$0")"

PORT=8000
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required to run LabFlow locally."
  read -r -p "Press Enter to close."
  exit 1
fi

echo "Starting LabFlow at http://localhost:$PORT/"
python3 -m http.server "$PORT" >/tmp/labflow-http-server.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 1
open "http://localhost:$PORT/"
wait "$SERVER_PID"
