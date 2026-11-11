# 🏛️ Legacy Archives — WPipe Studio

Módulos históricos y prototipos archivados que han sido reemplazados por la arquitectura local-first desacoplada (`pipelines/engine`).

```mermaid
flowchart LR
    Legacy["legacy/backend (FastAPI Monolito Clásico)"] -.->|Reemplazado por| Modern["pipelines/engine + edge/cloudfire"]

    style Legacy fill:#475569,color:#fff,stroke:#94a3b8
    style Modern fill:#1e293b,color:#fff,stroke:#10b981
```

> [!NOTE]
> Estos componentes se mantienen únicamente con fines de auditoría histórica y compatibilidad retrospectiva.
