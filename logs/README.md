# 📝 Execution Logs

Directorio de registros de ejecución del daemon, workers y procesos de backend de **WPipe Studio**.

## 📌 Gestión de Logs
Los registros generados en este directorio permiten el diagnóstico de incidentes, trazas de depuración de pipelines y auditoría de conexión de sockets IPC.

```mermaid
flowchart TD
    Daemon["wpipe-engine Daemon"] -->|Structured Logs| LogFiles["logs/wpipe_YYYY-MM-DD.log"]
    Backend["Backend Service"] -->|Telemetry & Traces| LogFiles
    
    style Daemon fill:#1e293b,color:#fff,stroke:#3b82f6
    style Backend fill:#1e293b,color:#fff,stroke:#10b981
    style LogFiles fill:#1e293b,color:#fff,stroke:#f59e0b
```

> [!NOTE]
> Los archivos de log con marcas de tiempo (`*.log`) son temporales y están ignorados por `.gitignore`.
