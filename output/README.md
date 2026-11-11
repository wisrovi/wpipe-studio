# 📦 Output Artifacts & Databases

Directorio reservado para la persistencia efímera y bases de datos generadas por el runtime durante pruebas y benchmarks.

## 📌 Contexto de Datos
Contiene bases de datos locales SQLite utilizadas por el subsistema de telemetría, auditoría de pasos y almacenamiento transitorio.

```mermaid
flowchart TD
    Engine["WPipe Studio Engine"] -->|Audit / Tracking| DB[("output/tracking.db<br/>(WAL SQLite)")]
    Engine -->|Data Ingestion| DataDB[("output/data.db")]
    
    style Engine fill:#1e293b,color:#fff,stroke:#3b82f6
    style DB fill:#1e293b,color:#fff,stroke:#10b981
    style DataDB fill:#1e293b,color:#fff,stroke:#6366f1
```

> [!WARNING]
> Los archivos binarios de base de datos (`.db`, `.sqlite`, `.sqlite-wal`) están excluidos del control de versiones por `.gitignore`.
