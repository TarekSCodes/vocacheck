@echo off
echo Starting VocaCheck...
docker compose up -d
if %errorlevel% neq 0 (
  echo.
  echo ERROR: Could not start containers. Is Docker Desktop running?
  pause
  exit /b 1
)
echo.
echo VocaCheck is running at http://localhost:8080
start http://localhost:8080
