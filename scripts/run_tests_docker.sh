#!/usr/bin/env bash
set -e

echo "Running unit tests inside Docker container..."

docker run --rm \
  -v "$(pwd)/legacy/backend:/app" \
  -v "$(pwd)/..:/workspace" \
  -e WPIPE_WORKSPACE_ROOT=/workspace \
  -w /app \
  python:3.11-slim \
  bash -c "pip install --no-cache-dir -r requirements.txt && python -m pytest -q"

echo "Docker test execution completed successfully."
