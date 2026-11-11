# 🏗️ Infrastructure & Local Environments — WPipe Studio

Configuración de contenedores Docker, compose files y entornos de desarrollo web integrados.

## 📌 Arquitectura & Flujo
```mermaid
flowchart TD
    Compose["infra/dev-environment/docker-compose.yaml"] --> CodeServer["VS Code Web (code-server)"]
    Compose --> PG["PostgreSQL Dev Instance"]
    CodeServer --> TestApp["Reference WPipe Microservice"]

    style Compose fill:#1e293b,color:#fff,stroke:#3b82f6
    style CodeServer fill:#1e293b,color:#fff,stroke:#10b981
    style PG fill:#1e293b,color:#fff,stroke:#f59e0b
    style TestApp fill:#1e293b,color:#fff,stroke:#ec4899
```

## 📁 Subdirectorios
- `dev-environment/`: Contenedor y configuración de `code-server` para pruebas integradas de la extensión en navegador.
