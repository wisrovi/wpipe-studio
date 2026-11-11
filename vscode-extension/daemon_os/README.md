# wpipe-engine — Native System Daemon & Local Core Engine

> **High-Performance Local Execution Engine, AST Compiler & Entitlement Enforcer for WPipe Studio (wisrovi SUITE).**

---

## Overview

`wpipe-engine` is the standalone, native system daemon and local intelligence core of **WPipe Studio**. It handles topological DAG resolution, AST-driven Python microservice compilation, real-time step simulation, and cryptographic freemium entitlement enforcement directly on the developer's workstation without cloud latency or third-party server costs.

---

## Key Technologies and Libraries

| Category | Technology / Library | Role & Details |
|---|---|---|
| **Runtime** | **Python 3.11+ / CPython** | Core execution runtime for AST transformation, dependency analysis, and simulation. |
| **Pipeline Core** | **WPipe** (`>=2.5.13`) & **wdecorators** | Native pipeline runtime engine, execution monitoring, and step orchestration. |
| **Streaming Integration** | **`wkafka`** (`>=1.0.0`) | Official corporate library for Kafka streaming consumers, producers, and serializers. |
| **Persistence (Tracking)**| **`wsqlite`** & SQLite3 | Local forensic metrics database (`tracking.db`) recording step runtimes and RAM consumption. |
| **Cryptography** | **PyCA Cryptography** (`cryptography`) | Asymmetric Ed25519 signature verification on compact JWS lease tokens with machine fingerprint binding. |
| **IPC Protocols** | **Unix Domain Sockets** (`socket.AF_UNIX`) & **HTTP PNA** | High-throughput local socket communication (`/tmp/wpipe.sock`) and W3C PNA HTTP server (`127.0.0.1:49152`). |
| **Code Formatting** | **Black** & **isort** | Deterministic formatting applied server-side to generated Python microservices. |
| **Binary Packaging** | **PyInstaller** / **Nuitka** | Compilation into a closed, standalone native executable (`dist/wpipe-engine`). |
| **Testing** | **pytest** & **pytest-cov** | 56 automated unit, security, and penetration test cases. |

---

## Architecture & Directory Layout

```
vscode-extension/daemon_os/
├── wpipe_engine/
│   ├── core/
│   │   ├── compiler.py        # AST pipeline compiler, code generation, and merge engine
│   │   ├── entitlements.py    # Ed25519 cryptographic token parser and plan validator
│   │   ├── licensing.py       # Floating seats and hardware machine fingerprinting
│   │   ├── limiter.py         # Plan quota guard and node classifier (Free vs Pro)
│   │   ├── runner.py          # Step-by-step pipeline execution and live simulation
│   │   └── workspace.py       # Local file management under ~/.wpipe/workspaces
│   ├── ipc/
│   │   └── server.py          # Dual Unix Socket & HTTP server implementation
│   ├── main.py                # Command-line interface and daemon runner
│   └── canvas_static/         # Embedded PWA web UI assets served locally
├── tests/                     # Unit and security test suite
├── build.sh                   # Native binary compilation script (PyInstaller)
├── coverage.sh                # Test coverage execution script
└── wpipe-engine.spec          # PyInstaller bundle specification
```

---

## Core Capabilities

1. **Topological Pipeline Compilation**:
   - Compiles visual Canvas IR into enterprise-grade Python microservices conforming strictly to `wpipe-mcp` standards.
   - Generates entrypoints for **FastAPI REST API** (`/run`) and **WKafka Streaming Workers** (`@kafka.consumer`).
   - Generates strict Pydantic v2 DTOs, class-based `@step` definitions, integration tests (`test_pipeline.py`, `test_api.py`, `test_consumer.py`), Dockerfiles, and Makefiles.
2. **Smart AST Code Merge**:
   - Preserves user-written custom imports (`# >>> [WPIPE:CUSTOM_IMPORTS]`) and logic (`# >>> [WPIPE:CUSTOM_LOGIC]`) across repeated visual re-compilations.
3. **Hardware Machine Fingerprinting & Floating Seats**:
   - Derives a deterministic SHA-256 fingerprint from motherboard UUID, CPU ID, and MAC address.
   - Multiple local OS users on the same machine share 1 single seat.
4. **Tamper-Proof Plan Enforcement**:
   - The engine is the **single enforcement point**. Limits are checked server-side using signed Ed25519 tokens.
   - **Free Plan**: Up to 5 blocks per pipeline.
   - **Pro Plan**: Unlimited blocks, advanced control blocks (`Parallel`, `Background`, `AI Step`), and live simulation.

---

## CLI Usage

```bash
# Check daemon status and active license
wpipe-engine status

# Display hardware machine fingerprint
wpipe-engine fingerprint

# Activate a Pro license key against Cloudflare Edge (api.wisrovi.dev)
wpipe-engine activate WPIPE-PRO-KEY-xxxx-xxxx

# Start the background daemon
wpipe-engine daemon --socket /tmp/wpipe.sock
```

---

## Running Tests and Building

### Run Pytest Suite
```bash
pytest tests/ -v
```

### Calculate Test Coverage
```bash
./coverage.sh
```

### Compile Native Binary
```bash
./build.sh
```
Produces the standalone native binary in `dist/wpipe-engine`.

---

## ⚖️ Copyright & Attribution

- **Platform**: [WPipe Studio](https://github.com/wisrovi/wpipe-studio) (wisrovi SUITE)
- **Author**: **William Rodriguez** ([wisrovi.dev](https://wisrovi.dev)) — AI Leader & Solutions Architect
- **Copyright © 2026 wisrovi ([wisrovi.dev](https://wisrovi.dev)). All Rights Reserved.**
