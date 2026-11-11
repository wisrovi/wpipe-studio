# 📚 Documentación Técnica & Marketing — WPipe Studio

Directorio central de especificaciones de producto, material gráfico oficial y guías metodológicas.

## 📌 Estructura
- `skills/`: Habilidades y especificaciones operativas para agentes inteligentes (ej. pruebas automatizadas de la extensión en VS Code Web).
- `marketing/`: Capturas y composiciones oficiales en alta resolución (`.webp`) del canvas visual y del entorno IDE integrado.
- `CNAME`: Registro canónico de dominio para el portal de documentación.

```mermaid
flowchart TD
    Docs["docs/"] --> Skills["skills/<br/>Agentic Skills & SOPs"]
    Docs --> Marketing["marketing/<br/>High-Res WebP Showcases"]
    Docs --> Web["CNAME / Web Portal"]
    
    style Docs fill:#1e293b,color:#fff,stroke:#3b82f6
    style Skills fill:#1e293b,color:#fff,stroke:#10b981
    style Marketing fill:#1e293b,color:#fff,stroke:#ec4899
    style Web fill:#1e293b,color:#fff,stroke:#f59e0b
```
