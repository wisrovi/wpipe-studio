# WPipe Studio — Backend Service & Workspace Engine

> **Enterprise Backend API and Workspace Management Service for WPipe Studio (wisrovi SUITE).**

---

## Overview

The `backend` service provides core REST APIs, workspace persistence, project lifecycle management, and integration layers for WPipe Studio. Built following the Data Access Layer (DAL) pattern with **FastAPI**, **Pydantic v2**, and **WPostgreSQL**, it coordinates pipeline designs, simulation logs, and local workspace directories.

---

## Key Technologies and Libraries

| Category | Technology / Library | Role & Details |
|---|---|---|
| **Web Framework** | [FastAPI](https://fastapi.tiangolo.com/) (`>=0.110.0`) | High-performance asynchronous web framework providing auto-generated OpenAPI docs (`/docs`). |
| **ASGI Server** | [Uvicorn](https://www.uvicorn.org/) (`>=0.28.0`) | Lightning-fast ASGI web server implementation for Python. |
| **Data Validation** | [Pydantic v2](https://docs.pydantic.dev/) & [Pydantic-Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) | Strict schema validation, DTOs, and typed environment configuration. |
| **Persistence (Corporate Suite)** | **`wpostgresql`** (Mandatory Corporate Library) | Enterprise PostgreSQL DAL with typed repositories, connection pooling, and automated schema migration. |
| **Persistence (Fallback)** | **`wsqlite`** (Mandatory Corporate Library) | Lightweight file-based SQLite driver for offline local workspace execution. |
| **Driver Engine** | `psycopg[binary,pool]` (`>=3.1.0`) | Thread-safe connection pooling and binary PostgreSQL protocol client. |
| **Testing Framework** | [pytest](https://docs.pytest.org/) & [pytest-cov](https://pytest-cov.readthedocs.io/) | Full unit, integration, and regression testing suite with strict coverage enforcement. |
| **Containerization** | Docker & Docker Compose | Isolated execution sandbox and reproducible containerized deployments. |

---

## Architecture & Directory Layout

```
backend/
├── app/
│   ├── api/                   # REST API routes and versioned endpoints
│   ├── core/                  # Security, authentication, and error handling
│   ├── config/                # Centralized settings and environment configs
│   ├── models/                # Database entities and relational schemas
│   ├── schemas/               # Pydantic DTOs and Canvas Intermediate Representation (IR)
│   ├── services/              # Business logic, IR transformation, and catalog services
│   ├── repositories/          # Typed Data Access Layer repositories (PostgreSQL/SQLite)
│   └── main.py                # FastAPI entrypoint application
├── tests/                     # Unit and integration test suite
├── Dockerfile                 # Container image specification
└── requirements.txt           # Production and development dependencies
```

---

## Running the Backend

### Local Development
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run with autoreload
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation will be available at `http://localhost:8000/docs`.

### Running with Docker Compose
```bash
docker-compose up -d backend
```

---

## How to Run Tests and Coverage

### Local Pytest
```bash
pytest tests/ -v
```

### Coverage Report
```bash
pytest --cov=app --cov-report=term-missing tests/
```

### Running Inside Docker
```bash
../run_tests_docker.sh
```

---

## ⚖️ Copyright & Attribution

- **Platform**: [WPipe Studio](https://github.com/wisrovi/wpipe-studio) (wisrovi SUITE)
- **Author**: **William Rodriguez** ([wisrovi.dev](https://wisrovi.dev)) — AI Leader & Solutions Architect
- **Copyright © 2026 wisrovi ([wisrovi.dev](https://wisrovi.dev)). All Rights Reserved.**
