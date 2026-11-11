# 🛠️ Automation & Build Scripts — WPipe Studio

Scripts de automatización operativa, ejecución de tests en sandbox Docker y generación de reportes de cobertura.

## 📌 Arquitectura & Flujo
```mermaid
flowchart LR
    Dev["Developer / CI Gate"] --> Make["Makefile (Targets)"]
    Make --> Scripts["scripts/run_tests_docker.sh"]
    Scripts --> Docker["Docker Sandbox (python:3.11-slim)"]
    Docker --> Results["Verification Reports"]

    style Dev fill:#1e293b,color:#fff,stroke:#3b82f6
    style Make fill:#1e293b,color:#fff,stroke:#10b981
    style Scripts fill:#1e293b,color:#fff,stroke:#f59e0b
    style Docker fill:#1e293b,color:#fff,stroke:#6366f1
    style Results fill:#1e293b,color:#fff,stroke:#ec4899
```

## 📁 Scripts Incluidos
- `run_tests_docker.sh`: Ejecuta la batería completa de pruebas unitarias en un contenedor Docker aislado.
- `run_coverage.sh`: Genera reportes de cobertura de código.
