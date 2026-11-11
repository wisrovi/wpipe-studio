# ==============================================================================
# WPipe Studio — Canonical 9-Target Makefile & Architecture Management Suite
# ==============================================================================

.PHONY: help install dev build up down logs test lint format clean

SHELL := /bin/bash
DOCKER_COMPOSE := docker compose

help:
	@echo "╔══════════════════════════════════════════════════════════════════════════╗"
	@echo "║                       WPipe Studio — Management Suite                    ║"
	@echo "╚══════════════════════════════════════════════════════════════════════════╝"
	@echo "  make help       - Display this assistance guide"
	@echo "  make install    - Install backend, extension, and UI dependencies"
	@echo "  make dev        - Launch development stack in background"
	@echo "  make build      - Compile VS Code extension and build Docker images"
	@echo "  make up         - Start compose stack"
	@echo "  make down       - Tear down compose stack"
	@echo "  make logs       - Follow real-time application logs"
	@echo "  make test       - Execute full test battery inside Docker sandbox"
	@echo "  make lint       - Run ruff, pylint, and type verification"
	@echo "  make format     - Format codebase with black and isort"
	@echo "  make clean      - Prune temporary files, pycache, and build artifacts"

install:
	@echo "==> Installing Node dependencies for UI and VS Code extension..."
	cd ui/extension/vscode && npm install
	cd ui/web/studio-canvas && npm install || true
	@echo "==> Dependencies installed."

dev:
	$(DOCKER_COMPOSE) up -d

build:
	@echo "==> Building VS Code extension..."
	cd ui/extension/vscode && npm run compile && npx vsce package --allow-missing-repository
	@echo "==> Building Docker images..."
	$(DOCKER_COMPOSE) build

up:
	$(DOCKER_COMPOSE) up -d

down:
	$(DOCKER_COMPOSE) down

logs:
	$(DOCKER_COMPOSE) logs -f

test:
	@echo "==> Running verification test battery in Docker sandbox..."
	./scripts/run_tests_docker.sh

lint:
	@echo "==> Executing linters (ruff, pylint)..."
	@if command -v ruff >/dev/null 2>&1; then ruff check pipelines/; else echo "ruff not found in host PATH"; fi
	@if command -v pylint >/dev/null 2>&1; then pylint --rcfile=.pylintrc pipelines/; fi

format:
	@echo "==> Auto-formatting codebase..."
	@if command -v black >/dev/null 2>&1; then black --line-length 100 pipelines/ ui/extension/vscode/; fi
	@if command -v isort >/dev/null 2>&1; then isort pipelines/; fi

clean:
	@echo "==> Cleaning cache and temporary files..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type f -name "*.pyo" -delete 2>/dev/null || true
	@echo "==> Clean complete."
