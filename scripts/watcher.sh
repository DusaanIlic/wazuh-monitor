#!/bin/bash
set -u

AGENT_ID="${1:?Upotreba: watcher.sh AGENT_ID BACKEND_URL}"
BACKEND_URL="${2:?Upotreba: watcher.sh AGENT_ID BACKEND_URL}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCREENSHOT_SCRIPT="$SCRIPT_DIR/take-screenshot.py"
POLL_INTERVAL=3

echo "Watcher pokrenut za agenta $AGENT_ID, backend: $BACKEND_URL"

while true; do
  RESPONSE=$(curl -s -f "$BACKEND_URL/api/screenshots/pending/$AGENT_ID")

  if [ $? -eq 0 ]; then
    if echo "$RESPONSE" | grep -q '"pending":true'; then
      echo "Pending screenshot zahtev detektovan za agenta $AGENT_ID"
      python3 "$SCREENSHOT_SCRIPT" "$AGENT_ID" "$BACKEND_URL"
    fi
  else
    echo "Greška pri pozivu backend-a, pokušavam ponovo za $POLL_INTERVAL s" >&2
  fi

  sleep "$POLL_INTERVAL"
done
