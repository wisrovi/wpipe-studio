# ⚡ WPipe Microservices & Pipelines

Directorio raíz que agrupa todos los microservicios del sistema impulsados y orquestados nativamente con **WPipe**.

## 📌 Arquitectura & Flujo
```mermaid
flowchart LR
    Engine["pipelines/engine<br/>(Local Daemon & AST Compiling)"]
    Verifier["pipelines/verifier<br/>(Docker QA Gate & Dry Run)"]
    Admin["pipelines/licensing-admin<br/>(Licensing Orchestrator & Streamlit)"]

    Engine <--> Verifier
    Engine <--> Admin

    style Engine fill:#1e293b,color:#fff,stroke:#3b82f6
    style Verifier fill:#1e293b,color:#fff,stroke:#10b981
    style Admin fill:#1e293b,color:#fff,stroke:#f59e0b
```

## 🛠️ Filosofía WPipe
Cada servicio en este directorio está modelado como un pipeline desacoplado, con un Context Pydantic por estado, contratos estrictos y ejecución modular libre de monolitos.
