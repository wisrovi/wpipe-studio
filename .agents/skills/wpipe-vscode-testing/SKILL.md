---
name: wpipe-vscode-testing
description: Procedimiento operativo estándar y metodología rigurosa para probar la extensión WPipe Studio en VS Code Web mediante los contenedores Docker y MCP Chrome DevTools.
---

# Procedimiento de Pruebas de WPipe Studio (VS Code Extension & Tri-Instance Docker)

Este documento detalla el procedimiento estandarizado para probar de forma integral y repetible la extensión `wisrovi.wpipe-vscode` en vivo.

---

## 1. Topología del Entorno de Pruebas

El entorno de pruebas de la extensión de VS Code se apoya en instancias simultáneas de `code-server` corriendo en contenedores Docker y mapeadas contra el workspace del microservicio generado:

| Instancia | Puerto Local | Contenedor Docker | Rol en Pruebas |
|---|---|---|---|
| **Página 1 (Instancia 1)** | `http://localhost:18081/?folder=/home/coder/workspace` | `ksldfg-code-server-1` | **Canvas Visual Blockly (`pipeline.wpipe`)**: Comprobación del layout de bloques, conexiones en serie/paralelo, badges de licencia (`Blocks X / ∞ · PRO`), paleta de herramientas y consola sin errores de CSP. |
| **Página 2 (Instancia 2)** | `http://localhost:18082/?folder=/home/coder/workspace` | `ksldfg-code-server2-1` | **Explorador y Árbol de Estados (`app/states/`)**: Inspección del registro de estados, archivos `.py` sincronizados, creación vía Wizard y árbol lateral de pasos. |
| **Página 3 (Instancia 3)** | `http://localhost:18083/?folder=/home/coder/workspace` | `ksldfg-code-server3-1` | **Editor de Código Python (`app/pipelines.py`)**: Validación del código descompilado/compilado, ejecución con `execute_pipeline(payload)`, decoradores `@step` y `@to_obj`. |

---

## 2. Ciclo Completo de Compilación y Despliegue en Caliente

Siempre que se modifique código en la extensión nativa (`ui/extension/vscode/`):

### Paso 2.1: Compilar TypeScript
```bash
npm --prefix ui/extension/vscode run compile
```

### Paso 2.2: Empaquetar el VSIX
```bash
cd ui/extension/vscode
vsce package --no-git-tag-version --allow-missing-repository -o wpipe-vscode-2.0.0.vsix
cd ../../..
```

### Paso 2.3: Desplegar forzadamente en las instancias de Docker
```bash
VSIX="ui/extension/vscode/wpipe-vscode-2.0.0.vsix"
for C in ksldfg-code-server-1 ksldfg-code-server2-1 ksldfg-code-server3-1; do
    docker cp "$VSIX" "$C":/tmp/
    docker exec "$C" code-server --install-extension /tmp/wpipe-vscode-2.0.0.vsix --force
done
```

### Paso 2.4: Instalación en el VS Code Local del Host
```bash
code --install-extension ui/extension/vscode/wpipe-vscode-2.0.0.vsix --force
```

---

## 3. Arquitectura Canónica del Monorepo

| Directorio | Rol en el Sistema |
|---|---|
| **`pipelines/engine/`** | Motor daemon nativo local `wpipe-engine` (IPC Unix Domain Socket, PyInstaller, AST Compiling). |
| **`pipelines/verifier/`** | Orquestador de la batería de calidad QA Docker y validación en tiempo de ejecución (`dry_run_pipeline`). |
| **`pipelines/licensing-admin/`** | Aplicación Streamlit para administración y auditoría de licencias con `admin_cloudfire_pipeline`. |
| **`ui/extension/vscode/`** | Código TypeScript de la extensión VS Code (Custom Editor `*.wpipe` y palette de 196 steps). |
| **`ui/web/studio-canvas/`** | Interfaz web interactiva del lienzo de pipelines desplegada en `studio.wisrovi.dev`. |
| **`ui/web/superadmin/`** | Consola maestra de administración protegida por 2FA OTP (`admin.wisrovi.dev`). |
| **`ui/web/client-portal/`** | Portal cliente autoservicio para consulta y activación (`portal.wisrovi.dev`). |
| **`edge/cloudfire/`** | Cloudflare Worker API (`api.wisrovi.dev`) con D1 Database, firmas Ed25519 y webhooks de pago. |
| **`contracts/`** | Esquemas JSON formales del IR (`contracts/ir/wpipe-schema.json`) y catálogo oficial (`contracts/catalog/steps_catalog.json`). |
| **`scripts/`** | Scripts operativos de ejecución de tests en sandbox Docker y coberturas. |
