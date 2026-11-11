# WPipe Studio — Web UI & Visual Workspace (Frontend SPA & PWA)

> **High-Performance Visual Pipeline Canvas and Microservice Studio Web Application.**

---

## Overview

The `frontend` package provides the responsive Single Page Application (SPA) and Progressive Web App (PWA) for **WPipe Studio**. Inspired by VS Code's user experience, it features an interactive **Google Blockly** visual canvas for assembling WPipe DAGs, real-time pipeline simulation with breakpoint stepping, an interactive Mermaid flowchart, and an integrated Web-to-Local Engine Bridge communicating with `wpipe-engine`.

---

## Key Technologies and Libraries

| Category | Technology / Library | Role & Details |
|---|---|---|
| **UI Framework** | [React 18](https://react.dev/) | Concurrent rendering and functional components with hooks. |
| **Language & Typings** | [TypeScript](https://www.typescriptlang.org/) | Strict static typing and interface contracts across components and state. |
| **Bundler & Tooling** | [Vite](https://vitejs.dev/) | Instant Hot Module Replacement (HMR) and optimized Rollup production builds. |
| **Styling & Theme** | [Tailwind CSS](https://tailwindcss.com/) & [PostCSS](https://postcss.org/) | Dark-mode design system following VS Code aesthetics (`#1e1e1e`, `#252526`, `#007acc`). |
| **Visual Block Canvas** | [Blockly](https://developers.google.com/blockly) (`blockly >= 11.0.0`) | Visual block programming workspace with custom WPipe triggers, C-blocks, and steps. |
| **Flowchart & Graphing** | [Mermaid.js](https://mermaid.js.org/) & [D3](https://d3js.org/) | Dynamic directed acyclic graph (DAG) visualization with pan, zoom, and export. |
| **Code Highlighting** | [PrismJS](https://prismjs.com/) | Real-time syntax highlighting for generated Python, YAML, Dockerfile, and JSON. |
| **Markdown Engine** | [Marked](https://marked.js.org/) | Fast GitHub-Flavored Markdown rendering for documentation and step details. |
| **Icons** | [Lucide React](https://lucide.dev/) | Clean, consistent developer tooling iconography. |
| **Cryptography** | [WebCrypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) | Native in-browser Ed25519 signature verification for tamper-proof licensing. |
| **PWA & Offline** | Service Worker (`sw.js`) | Offline static asset caching and desktop PWA installability. |

---

## Architecture & Component Structure

```
frontend/
├── src/
│   ├── components/            # React UI components (BlocklyWorkspace, Inspector, Modals, Menus)
│   ├── lib/                   # Engine bridge (PNA), project storage, cryptography, and IR schemas
│   ├── App.tsx                # Main VS Code-style IDE shell and workspace coordinator
│   ├── main.tsx               # Application bootstrap entrypoint
│   └── index.css              # Global Tailwind utilities and canvas styles
├── public/                    # Static assets, steps catalog manifest, PWA icons and sw.js
├── package.json               # NPM package dependencies and build scripts
└── vite.config.ts             # Vite build configuration and dev server proxy settings
```

---

## Getting Started

### Development Mode
```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
```

The web workspace will be available at `http://localhost:5173`.

### Production Build & Preview
```bash
# Compile and bundle
npm run build

# Preview production bundle
npm run preview
```

---

## Key Features

1. **Google Blockly Pipeline Canvas**:
   - Visual blocks for triggers (`API REST`, `Kafka Consumer`, `Redis Queue`, `Cron Schedule`).
   - Structural control C-blocks (`Condition / If-Else`, `For Loops`, `While`, `Parallel Branches`, `Background Tasks`).
   - Step Registry connecting to the 197-step `wpipe-steps` catalog.
2. **Interactive Simulation Stage**:
   - Real-time step-by-step pipeline execution and context mutation table.
   - Breakpoint debugging (`F5` Continue, `F10` Step) with simulated and live engine backends.
3. **Web-to-Local Engine Bridge (W3C PNA)**:
   - Connects directly to `wpipe-engine` running locally on `http://127.0.0.1:49152` using W3C Private Network Access preflights.
4. **Offline PWA Support**:
   - Installable as a standalone desktop progressive web app with service worker caching.

---

## ⚖️ Copyright & Attribution

- **Platform**: [WPipe Studio](https://github.com/wisrovi/wpipe-studio) (wisrovi SUITE)
- **Author**: **William Rodriguez** ([wisrovi.dev](https://wisrovi.dev)) — AI Leader & Solutions Architect
- **Copyright © 2026 wisrovi ([wisrovi.dev](https://wisrovi.dev)). All Rights Reserved.**
