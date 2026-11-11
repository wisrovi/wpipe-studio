# WPipe Studio — VS Code Suite, Native Engine & Edge Licensing

> **Complete Ecosystem for Visual WPipe Pipeline Engineering, Production Microservice Generation, and Edge-Based Software Protection.**

---

## Overview

The `vscode-extension` directory contains the complete desktop and edge-cloud licensing ecosystem for **WPipe Studio**. Operating under a **local-first** paradigm, it delivers zero-latency visual design and production Python microservice generation inside Visual Studio Code while keeping infrastructure operational costs at **0 €/month** via Cloudflare Workers and Cloudflare D1.

---

## Core Technologies and Relevant Libraries

| Subsystem | Key Technologies & Libraries | Role & Scope |
|---|---|---|
| **`extension/`** | **VS Code Extensibility API** (`vscode`), **TypeScript 5**, **esbuild**, **@lezer/python**, **Mermaid.js** | Native IDE extension providing Custom Editor (`*.wpipe`), CodeLens, and live DAG previews. |
| **`daemon_os/`** | **Python 3.11+**, **WPipe** (`>=2.5.13`), **`wkafka`**, **`wsqlite`**, **PyCA Cryptography** (Ed25519), **PyInstaller** | Local native engine daemon (`wpipe-engine`) listening on Unix Domain Sockets and HTTP localhost (`127.0.0.1:49152`). |
| **`cloudfire/`** | **Cloudflare Workers**, **Cloudflare D1** (Serverless SQL), **WebCrypto API Ed25519**, **Wrangler** | Sovereign edge licensing server issuing digitally signed 30-day lease tokens. |
| **`portal-cloudfire/`**| **React 18**, **Vite**, **TypeScript**, **Tailwind CSS**, **Lucide React** | Self-service customer portal hosted on Cloudflare Pages (`portal.wisrovi.dev`). |
| **`admin-web/`** | **React 18**, **Vite**, **TypeScript**, **Tailwind CSS**, **Lucide React** | Master administrative console for managing customers, licenses, and seat allocations (`admin.wisrovi.dev`). |

---

## Directory Layout

```
vscode-extension/
├── extension/                 # Visual Studio Code extension (VSIX package)
├── daemon_os/                 # Native system daemon (wpipe-engine) & compiler
├── cloudfire/                 # Serverless Cloudflare Edge licensing API
├── portal-cloudfire/          # Customer self-service portal (portal.wisrovi.dev)
└── admin-web/                 # Super-admin management console (admin.wisrovi.dev)
```

---

## Security Architecture & Freemium Enforcement

1. **Local-First Execution**: The visual canvas delegates all code generation, AST merging, and execution to `wpipe-engine` over Unix sockets (`/tmp/wpipe.sock`) or local HTTP (`127.0.0.1:49152`).
2. **Cryptographic Ed25519 Lease Tokens**: Licenses are digitally signed at the edge (`api.wisrovi.dev`) and verified offline by the local daemon using its embedded sovereign public key.
3. **Machine Hardware Fingerprinting**: Lease tokens are bound to motherboard UUID, CPU ID, and MAC address to prevent unauthorized license duplication.
4. **Strict Server-Side Quotas**:
   - **Free Plan**: Up to 5 blocks on canvas; restricts Pro-tier blocks (`Parallel`, `Background`, `AI Step`).
   - **Pro Plan**: Unlimited blocks, advanced control flow, streaming workers with `wkafka`, and live debugging.
5. **Interactive Overwrite Protection**: The custom editor automatically checks existing files in the workspace and prompts the user before modifying manually adjusted code.

---

## Verification and Testing

### 1. Engine Daemon Unit & Security Tests
```bash
cd daemon_os
pytest tests/ -v
```

### 2. VS Code Extension TypeScript Compile
```bash
cd extension
npm run compile
```

### 3. Edge Worker Typecheck
```bash
cd cloudfire
npx tsc --noEmit
```

---

## ⚖️ Copyright & Attribution

- **Platform**: [WPipe Studio](https://github.com/wisrovi/wpipe-studio) (wisrovi SUITE)
- **Author**: **William Rodriguez** ([wisrovi.dev](https://wisrovi.dev)) — AI Leader & Solutions Architect
- **Copyright © 2026 wisrovi ([wisrovi.dev](https://wisrovi.dev)). All Rights Reserved.**
