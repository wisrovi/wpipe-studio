---
name: wpipe-qa-verification
description: Metodología estricta de verificación de calidad en sandbox Docker, ejecución de batería de pruebas (black, ruff, mypy, pylint, pytest) y dry_run_pipeline.
---

# WPipe QA Verification & Quality Gate Loop

El núcleo de confiabilidad de WPipe Studio reside en su **Loop de Verificación**. Ningún microservicio se exporta como ZIP ni se da por completado a menos que ejecute de punta a punta y supere la batería estricta de calidad en un sandbox Docker aislado.

```mermaid
flowchart TD
    classDef start fill:#1e293b,stroke:#8b5cf6,stroke-width:2px,color:#fff;
    classDef test fill:#1e293b,stroke:#0284c7,stroke-width:2px,color:#fff;
    classDef error fill:#1e293b,stroke:#ef4444,stroke-width:2px,color:#fff;
    classDef pass fill:#1e293b,stroke:#10b981,stroke-width:2px,color:#fff;

    InputCode["Código del Microservicio Generado"]:::start
    Sandbox["Sandbox Docker Efímero"]:::test
    
    subgraph Battery ["Batería de Calidad Estricta"]
        Fmt["1. black & isort (Formateo y Orden de Imports)"]:::test
        LintFast["2. ruff (Linting Estático Rápido)"]:::test
        TypeCheck["3. mypy (Tipado Estricto sin 'Any' no permitidos)"]:::test
        LintFull["4. pylint (Puntaje ≥ 8.5 / 10)"]:::test
        UnitTests["5. pytest (Tests con Cobertura ≥ 60%)"]:::test
    end

    DryRun["6. dry_run_pipeline (Ejecución Real en Memoria)"]:::test
    AgentFix["Agente Reparador (con Traza Exacta del Error)"]:::error
    ZipReady["ZIP de Producción Listo para Descargar"]:::pass

    InputCode --> Sandbox
    Sandbox --> Fmt --> LintFast --> TypeCheck --> LintFull --> UnitTests
    UnitTests -->|Falla algún test o cobertura < 60%| AgentFix
    UnitTests -->|Pasa todo| DryRun
    DryRun -->|Falla en Runtime| AgentFix
    AgentFix -->|Parchea código| Sandbox
    DryRun -->|Ejecución Exitosa| ZipReady
```

---

## 1. El Gate de Calidad es Inviolable

- **Cero excepciones:** Si `pytest` falla, o la cobertura es inferior al 60%, el proceso aborta y **no se entrega ningún ZIP**.
- **Retroalimentación verbatim:** Cuando una herramienta de validación falla, el agente recibe la salida exacta del linter o compilador (archivo, línea, código de error) para realizar la corrección quirúrgica.
- **Límite de reintentos:** Se permiten un máximo de 5 iteraciones automáticas de reparación antes de solicitar intervención humana.

---

## 2. Los 6 Pasos de la Batería

| Paso | Herramienta | Objetivo | Criterio de Aprobación |
|---|---|---|---|
| **1** | `black` & `isort` | Consistencia estética y ordenación PEP 8 de imports. | Código limpio sin modificaciones requeridas (`--check`). |
| **2** | `ruff` | Detección ultrarrápida de variables no utilizadas, sintaxis y anti-patrones. | Cero errores nivel `E` y `F`. |
| **3** | `mypy` | Verificación estática de tipos en DTOs y firmas de estados. | Tipado consistente sin discrepancias. |
| **4** | `pylint` | Reglas avanzadas de complejidad ciclomática y buenas prácticas. | Puntuación estricta superior a 8.5/10. |
| **5** | `pytest` | Pruebas unitarias de estados, DTOs, API FastAPI y pipeline. | 100% de tests aprobados y `coverage >= 60%`. |
| **6** | `dry_run_pipeline` | Ejecución real en memoria con payloads de prueba sintéticos. | Finalización sin excepciones (`ProcessError`, `TimeoutError`). |

---

## 3. Ejecución de Tests en Docker

Para ejecutar las pruebas en el entorno aislado reproducible del proyecto:

```bash
# Ejecutar suite de pruebas unitarias y de integración dentro de Docker
./scripts/run_tests_docker.sh

# Ejecutar reporte de cobertura de código
./scripts/run_coverage.sh
```
