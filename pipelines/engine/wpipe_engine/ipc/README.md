# 📦 IPC Socket Server

Comunicación entre el daemon del motor y la extensión de VS Code vía sockets IPC/HTTP.

## 📌 Arquitectura & Flujo
```mermaid
flowchart LR
    Mod["IPC Socket Server"] --> WPipe["WPipe Studio Ecosystem"]
    style Mod fill:#1e293b,color:#fff,stroke:#3b82f6
    style WPipe fill:#1e293b,color:#fff,stroke:#10b981
```

## 🛠️ Rol en el Sistema
Este módulo forma parte de la arquitectura modular de **WPipe Studio**, garantizando separación de responsabilidades, tipado estricto y mantenibilidad.
