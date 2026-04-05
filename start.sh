#!/bin/bash
# start.sh - Launch VocaCheck application

echo "Starting VocaCheck..."

# Check Docker
if ! docker info &>/dev/null; then
    echo "Error: Docker is not running"
    exit 1
fi

# Start services
docker compose up -d || { echo "ERROR: Could not start containers. Is Docker running?"; exit 1; }

# Success message
echo "VocaCheck is running at http://localhost:8080"
echo "Logs: docker compose logs -f"
echo "Stop: docker compose down"

# Open browser
if command -v xdg-open &>/dev/null; then
  xdg-open http://localhost:8080
elif command -v open &>/dev/null; then
  open http://localhost:8080
fi