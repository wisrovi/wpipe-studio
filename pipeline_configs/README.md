# ⚙️ Pipeline Configs

Directorio de especificaciones y configuraciones de pipelines para **WPipe Studio**.

## 📌 Descripción General
Este directorio almacena los artefactos y volcados YAML generados durante las pruebas y ejecuciones del runtime de pipelines (`wpipe`). 

> [!NOTE]
> En la arquitectura canónica de **WPipe Studio**, los archivos YAML generados en directorios de configuración representan **instantáneas de ejecución** (artefactos derivados) y no contratos normativos. La fuente de verdad del diseño siempre reside en el Grafo / Intermediate Representation (IR) y en el código generado en `app/pipelines.py`.

```mermaid
flowchart LR
    IR["Intermediate Representation (IR)"] --> Pipeline["app/pipelines.py"]
    Pipeline -->|ConfigDir Dump| YAML["pipeline_configs/*.yaml"]
    
    style IR fill:#1e293b,color:#fff,stroke:#3b82f6
    style Pipeline fill:#1e293b,color:#fff,stroke:#10b981
    style YAML fill:#1e293b,color:#fff,stroke:#f59e0b
```

## 📁 Archivos Incluidos
- `main_pipeline.yaml`: Definición base de prueba de integración de pipelines principales.
- `admin_cloudfire_pipeline.yaml`: Configuración de pipeline para los servicios de administración y licencias.
- `test_components.yaml`: Validación de aislamiento de componentes individuales.
- `test_pipe_basic.yaml`: Pipeline mínimo de verificación sintáctica y estructural.
