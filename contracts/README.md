# 📜 Contratos y Esquemas del Ecosistema — WPipe Studio

Definición canónica de modelos de intercambio de datos, esquemas del Intermediate Representation (IR) y catálogos de steps oficiales.

## 📌 Arquitectura & Flujo
```mermaid
flowchart LR
    Canvas["UI Canvas / VS Code"] -->|Genera / Consume| IR["contracts/ir (wpipe-schema.json)"]
    Catalog["contracts/catalog (steps_catalog.json)"] -->|Alimenta Bloques| Canvas
    IR -->|Compila| Engine["pipelines/engine"]

    style Canvas fill:#1e293b,color:#fff,stroke:#3b82f6
    style IR fill:#1e293b,color:#fff,stroke:#10b981
    style Catalog fill:#1e293b,color:#fff,stroke:#f59e0b
    style Engine fill:#1e293b,color:#fff,stroke:#8b5cf6
```

## 📁 Subdirectorios
- `ir/`: Contiene el esquema JSON (`wpipe-schema.json`) del archivo `.wpipe` y pipelines de ejemplo.
- `catalog/`: Manifiesto canónico de los 196 steps oficiales (`steps_catalog.json`).
