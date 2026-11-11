# 📦 WPipe Verifier Pipeline

Microservicio orquestador de la batería de calidad, auditoría estática y validación en tiempo de ejecución (`dry_run_pipeline`).

## 📌 Arquitectura & Flujo
```mermaid
flowchart TD
    Src["Microservice Source Code"] --> Linters["Static Analysis (Ruff, Pylint, Mypy)"]
    Linters --> Tests["Unit Testing (Pytest >= 60% cov)"]
    Tests --> DryRun["Runtime Verification (dry_run_pipeline)"]
    DryRun --> Artifact["Verified Production ZIP"]

    style Src fill:#1e293b,color:#fff,stroke:#3b82f6
    style Linters fill:#1e293b,color:#fff,stroke:#f59e0b
    style Tests fill:#1e293b,color:#fff,stroke:#6366f1
    style DryRun fill:#1e293b,color:#fff,stroke:#10b981
    style Artifact fill:#1e293b,color:#fff,stroke:#ec4899
```

## 🛠️ Rol en el Sistema
Garantiza el **criterio de éxito único e inviolable** de WPipe Studio: ningún microservicio se descarga si no pasa la batería de calidad y ejecuta de punta a punta.
