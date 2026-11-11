# WPipe Studio — VS Code Extension & Custom Editor

> **Official Visual Studio Code Extension for Designing WPipe Workflows and Generating Production-Ready Microservices.**

---

## Overview

The `wpipe-vscode` extension embeds the entire WPipe Studio visual experience directly into **Visual Studio Code**. It provides a native Custom Editor for `*.wpipe` and `*.wpipe.json` pipeline files, intelligent CodeLens actions on Python step files, live Mermaid DAG flowcharts, and transparent communication with the local native daemon (`wpipe-engine`).

---

## Key Technologies and Libraries

| Category | Technology / Library | Role & Details |
|---|---|---|
| **Extension API** | [VS Code Extensibility API](https://code.visualstudio.com/api) (`^1.85.0`) | `CustomTextEditorProvider`, `CodeLensProvider`, commands, and Webview panels. |
| **Language & Tooling** | [TypeScript](https://www.typescriptlang.org/) & [esbuild](https://esbuild.github.io/) | Fast TypeScript compilation, type checking, and bundling into `dist/extension.js`. |
| **AST Parsing** | [@lezer/python](https://lezer.codemirror.net/) | High-speed Python incremental AST parser for CodeLens detection and structure extraction. |
| **Flowcharting** | Mermaid.js (`mermaid.min.js`) | Interactive live DAG preview rendered inside Webview panels. |
| **Packaging** | [@vscode/vsce](https://github.com/microsoft/vscode-vsce) | Official packaging tool producing installable `.vsix` binaries. |
| **IPC Client** | Node.js `net` & `http` | Dual-mode IPC communicating via Unix Domain Sockets (`/tmp/wpipe.sock`) and local HTTP (`127.0.0.1:49152`). |

---

## Key Features

1. **Interactive Custom Editor (`*.wpipe`)**:
   - Double-clicking or opening any `*.wpipe` file automatically launches the rich visual Scratch/Blockly canvas.
   - Synchronizes visual changes with Python microservice files in the workspace (`app/pipelines.py`, `app/main.py`, `app/states/`, `requirements.txt`).
   - **Interactive Overwrite Protection**: Displays a friendly confirmation notification (`[ Sobrescribir ]` / `[ Omitir ]` / `[ Sobrescribir todos ]`) whenever a generated file already exists on disk with differing content, guaranteeing no accidental loss of manual edits.

2. **Step Registry Explorer (`wpipeSteps`)**:
   - Dedicated Activity Bar view indexing all **197 official steps** from `wpipe-steps`, community plugins, and workspace states.
   - One-click step insertion and code generation.

3. **Live DAG Flowchart Preview (`DAGPanel`)**:
   - Real-time flowchart rendering of Python pipelines using Mermaid.
   - Click on any block to jump directly to its Python definition (`gotoLine`).
   - Export high-resolution diagrams to SVG and PNG.

4. **Python Pipeline Intelligence & CodeLens**:
   - Inline CodeLens buttons above `@step` decorators (*Run Step*) and pipeline declarations (*Preview DAG*, *Open Canvas*).
   - Rich snippets for creating steps, pipelines, and YAML configurations.

---

## Extension Commands

| Command | Action |
|---|---|
| `wpipe.previewDag` | Opens the live Mermaid DAG flowchart for the active pipeline. |
| `wpipe.openCanvas` | Opens the visual block canvas side-by-side. |
| `wpipe.createPipeline` | Initializes a new visual `*.wpipe` pipeline file in the workspace. |
| `wpipe.refreshCatalog` | Re-indexes the local and cloud step catalog. |
| `wpipe.startEngine` | Launches the local `wpipe-engine` daemon in the background. |
| `wpipe.stopEngine` | Gracefully stops the local engine daemon. |
| `wpipe.licenseStatus` | Displays the current plan, limits, and machine fingerprint. |
| `wpipe.activateLicense`| Prompts for an Ed25519 Pro license key to unlock unlimited canvas blocks. |

---

## Building and Packaging

```bash
# 1. Install dependencies
npm install

# 2. Compile TypeScript bundle
npm run compile

# 3. Package extension into installable VSIX
npx vsce package --no-dependencies -o wpipe-vscode-2.0.0.vsix
```

### Installation
```bash
code --install-extension wpipe-vscode-2.0.0.vsix --force
```

---

## ⚖️ Copyright & Attribution

- **Platform**: [WPipe Studio](https://github.com/wisrovi/wpipe-studio) (wisrovi SUITE)
- **Author**: **William Rodriguez** ([wisrovi.dev](https://wisrovi.dev)) — AI Leader & Solutions Architect
- **Copyright © 2026 wisrovi ([wisrovi.dev](https://wisrovi.dev)). All Rights Reserved.**
