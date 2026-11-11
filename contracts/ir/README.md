# 📐 Intermediate Representation (IR) Schemas

Esquemas formales JSON Schema para la representación intermedia de grafos de pipelines (`.wpipe`).

```mermaid
flowchart LR
    File[".wpipe JSON File"] --> Schema["wpipe-schema.json"]
    Schema --> Validator["IR Validator Engine"]
    style File fill:#1e293b,color:#fff,stroke:#3b82f6
    style Schema fill:#1e293b,color:#fff,stroke:#10b981
    style Validator fill:#1e293b,color:#fff,stroke:#f59e0b
```
