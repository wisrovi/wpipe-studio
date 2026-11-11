# 🖥️ Interfaces de Usuario (Frontends) — WPipe Studio

Colección de interfaces visuales del ecosistema, diseñadas con un núcleo compartido de canvas visual interactivo.

## 📌 Arquitectura & Flujo
```mermaid
flowchart TD
    Core["Shared Canvas Engine"] --> Studio["ui/web/studio-canvas (Web App)"]
    Core --> Extension["ui/extension/vscode (VS Code Webview)"]
    Admin["ui/web/superadmin (Master Portal)"] --> Edge["edge/cloudfire"]
    Client["ui/web/client-portal (Self-Service)"] --> Edge

    style Core fill:#1e293b,color:#fff,stroke:#3b82f6
    style Studio fill:#1e293b,color:#fff,stroke:#10b981
    style Extension fill:#1e293b,color:#fff,stroke:#6366f1
    style Admin fill:#1e293b,color:#fff,stroke:#f59e0b
    style Client fill:#1e293b,color:#fff,stroke:#ec4899
    style Edge fill:#1e293b,color:#fff,stroke:#f97316
```

## 📁 Componentes UI
- `web/studio-canvas`: Aplicación web interactiva para dibujar pipelines con bloques tipo Scratch / n8n.
- `web/superadmin`: Panel maestro de administración de clientes, licencias y métricas.
- `web/client-portal`: Portal cliente para activación y consulta de claves.
- `extension/vscode`: Extensión de VS Code con Custom Editor nativo (`*.wpipe`).
