#!/bin/bash
echo "Starting VocaCheck..."
docker compose up -d || { echo "ERROR: Could not start containers. Is Docker running?"; exit 1; }
echo ""
echo "VocaCheck is running at http://localhost:8080"
if command -v xdg-open &>/dev/null; then
  xdg-open http://localhost:8080
elif command -v open &>/dev/null; then
  open http://localhost:8080
fi
