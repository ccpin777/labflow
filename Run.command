#!/bin/bash
set -e
cd "$(dirname "$0")"

PYTHON_BIN="${LABFLOW_PYTHON:-python3}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "Python 3 is required to run LabFlow."
  read -r -p "Press Enter to close."
  exit 1
fi

printf '%s\n' "Open LabFlow in:" "1) Browser" "2) App"
read -r -p "Choose [1]: " choice
MODE="${choice:-1}"
[ "$MODE" = "1" ] && MODE="Browser"
[ "$MODE" = "2" ] && MODE="App"

case "$MODE" in
  Browser)
    exec "$PYTHON_BIN" desktop_runner.py --browser
    ;;
  App)
    if ! "$PYTHON_BIN" -c 'import webview' >/dev/null 2>&1; then
      echo "PyWebView is required to run LabFlow as a desktop app."
      echo "Install it with: $PYTHON_BIN -m pip install pywebview"
      read -r -p "Press Enter to close."
      exit 1
    fi
    exec "$PYTHON_BIN" desktop_runner.py
    ;;
  *)
    exit 0
    ;;
esac
