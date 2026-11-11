# 📚 Steps Catalog Specifications

Manifiesto canónico de release (`steps_catalog.json`) que define los 196 steps oficiales listados y soportados de `wpipe-steps`.

```mermaid
flowchart LR
    JSON["steps_catalog.json"] --> Registry["Step Registry Provider"]
    Registry --> Canvas["Canvas Visual Palette"]
    style JSON fill:#1e293b,color:#fff,stroke:#3b82f6
    style Registry fill:#1e293b,color:#fff,stroke:#10b981
    style Canvas fill:#1e293b,color:#fff,stroke:#f59e0b
```
