<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="220" />

# Vox

**Dictado por voz de alta precisión, directamente en su cursor activo**

<br />

[![English](https://img.shields.io/badge/English-README-blue?style=flat-square&logo=github)](README.md)
[![Português](https://img.shields.io/badge/Portugu%C3%AAs-README-green?style=flat-square&logo=github)](README.pt.md)
[![Español](https://img.shields.io/badge/Espa%C3%B1ol-README-orange?style=flat-square&logo=github)](README.es.md)
[![Français](https://img.shields.io/badge/Fran%C3%A7ais-README-blueviolet?style=flat-square&logo=github)](README.fr.md)
[![Deutsch](https://img.shields.io/badge/Deutsch-README-yellow?style=flat-square&logo=github)](README.de.md)
[![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-README-red?style=flat-square&logo=github)](README.zh-CN.md)
[![日本語](https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-README-crimson?style=flat-square&logo=github)](README.ja.md)
[![Italiano](https://img.shields.io/badge/Italiano-README-darkgreen?style=flat-square&logo=github)](README.it.md)

<br />

[![Electron](https://img.shields.io/badge/Electron-33-black?style=flat-square&logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-18-black?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-black?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Platform](https://img.shields.io/badge/Platform-Windows-black?style=flat-square&logo=electron&logoColor=white)](https://electronjs.org)
[![License](https://img.shields.io/badge/License-MIT-black?style=flat-square)](LICENSE)

</div>

---

<div align="center">
  <img src="src/assets/Vox - UI.png" alt="Vista Previa de Vox" width="850" />
</div>

<br />

## ◈ ¿Qué es Vox?

**Vox** es un asistente de dictado por voz para **Windows** impulsado por IA y desarrollado con Electron. Permanece silencioso en la bandeja del sistema y, al activarse mediante un atajo global (`F9`/`F10`), el historial de voz (`F11`) o la palabra de activación (**"Vox"**), graba su voz, se detiene automáticamente al detectar silencio, transcribe mediante **Whisper**, corrige puntuación y ortografía con un LLM e inserta el texto **directamente en el cursor activo** de cualquier aplicación.

> Imagínelo como dictado nativo a nivel de sistema operativo: esté donde esté (VS Code, Word, un correo o Slack), diga *"Vox"*, hable, y en cuanto termine, el texto aparecerá donde estaba su cursor.

> **Vox es una alternativa de código abierto a [Wispr Flow](https://wisprflow.ai)** — dictado por voz con IA, atajos globales, un **sistema de comandos de voz** manos libres, corrección contextual, plantillas estructuradas e inyección de texto mediante APIs nativas de Win32.

---

## ◈ Comparativa: Vox vs Wispr Flow

| Característica | **Vox** | **Wispr Flow** |
|---|---|---|
| **Modelo de Licencia** | 100% Código Abierto (MIT), Gratuito | Propietario / Comercial |
| **Costo / Plan Gratuito** | Gratuito para uso diario (Groq/OpenAI/modelos locales) | Límite de 2.000 palabras/sem (Pro: $9 a $29+/mes) |
| **Activación por Voz** | Palabra clave "Vox" + atajos + comandos de voz | Depende de atajos/nube |
| **Elección de Proveedor** | Groq, OpenAI, Azure OpenAI, Ollama, LM Studio | Exclusivo en su nube |
| **Privacidad** | API directa sin intermediarios; registro auditable | Procesamiento en nube propietaria |
| **Plataformas** | Windows | Mac, Windows, iOS |
| **Parada Automática (VAD)** | Sí, se detiene y pega texto tras detectar silencio | Sí |
| **Corrección Contextual** | Sí (detecta editores de código, correos, documentos) | No |
| **Plantillas de Dictado** | Sí (correos, listas, minutas de reunión, commits…) | No |
| **Comandos de Voz** | Sí (puntuación, edición, sistema, personalizados) | No |
| **Vocabulario Personal** | Sí (términos personalizados enviados al corrector) | No |
| **Historial de Portapapeles** | Sí (últimos 10 dictados, reinsertables con F11) | No |

#### Ventajas

* **100% gratuito y de código abierto** — sin suscripciones, código totalmente auditable.
* **Libertad de proveedores** — use Groq, OpenAI, Azure OpenAI o ejecute 100% local con **Ollama** o **LM Studio** para costo cero y total privacidad.
* **Corrección contextual** — Vox detecta la aplicación activa y adapta la corrección ("editor de código" vs "correo electrónico").
* **Sistema de comandos de voz** — dicte signos de puntuación, navegación, edición y comandos de sistema; cree los suyos propios.
* **Historial de patrones** — tras 25 sesiones, Vox aprende automáticamente sus correcciones recurrentes.
* **Vocabulario personal** — agregue nombres propios, siglas y jerga técnica para que Whisper siempre los escriba correctamente.
* **Registro de privacidad** — cada llamada API (endpoint, proveedor, bytes enviados) se almacena localmente y es auditable.
* **Plantillas estructuradas** — dicte directamente correos con formato, listas de puntos, minutas de reunión, mensajes de commit y más.

#### Limitaciones

* **Requiere un proveedor** — para proveedores en la nube se requiere su propia clave API; los proveedores locales corren completamente en su equipo.
* **Exclusivo para Windows** — optimizado para una experiencia estable en Windows 10/11.

---

## ◈ Casos de Uso

| Caso de Uso | Descripción |
|---|---|
| **Dictado por Voz** | Diga *"Vox"* o use atajos para escribir en cualquier aplicación |
| **Productividad** | Redacte correos, código y documentos sin usar las manos |
| **Comandos de Voz** | Dicte signos y acciones ("coma", "nueva línea", "deshacer", "borrar palabra") |
| **Salida Estructurada** | Dicte directamente en plantillas (viñetas, minutas, commits) |

---

## ◈ Características Principales

```
◆  Dictado en tiempo real con palabra de activación ("Vox"), F9 (Push-to-Talk) o F10 (Alternar)
◆  Previsualización de transcripción progresiva en tiempo real durante la grabación
◆  Parada automática por silencio (VAD configurable) con inyección instantánea en el cursor
◆  Soporte multiproveedor: Groq, OpenAI, Azure OpenAI, Ollama, LM Studio
◆  Selección de modelos: elija sus modelos de STT y LLM desde el proveedor
◆  Corrección LLM adaptada al contexto de la aplicación activa
◆  Memoria de vocabulario personal (nombres propios, siglas, términos técnicos)
◆  Corrección por historial de patrones: auto-aprendizaje de correcciones tras 25 sesiones
◆  Sistema de comandos de voz (puntuación, navegación, edición, control de Vox, sistema)
◆  Comandos personalizados y fragmentos de texto (snippets)
◆  Plantillas de dictado estructuradas (correo, listas, minutas, commits, etc.)
◆  Historial de voz (F11) — reinserte cualquiera de los últimos 10 dictados
◆  Registro de privacidad auditable (endpoint, proveedor, bytes por solicitud)
◆  HUD Dock flotante con visualizador de energía de voz en tiempo real
◆  Proceso en segundo plano en la bandeja del sistema
◆  Inicio automático con Windows (configurable)
◆  Persistencia SQLite con cifrado nativo seguro safeStorage para claves API
◆  Interfaz de usuario moderna con efecto Glassmorphism (Playfair Display + IBM Plex Sans)
```

---

## ◈ Arquitectura

Vox utiliza la arquitectura estándar de Electron separando el **Proceso Principal** (Node.js), el **Proceso de Renderizado** (React) y el **Preload** (puente IPC seguro).

El flujo de dictado es:

```
STT → Command Parser → [ Voice Command Executor | LLM Corrector (+ plantilla) ] → Injector
```

---

## ◈ Atajos Globales

| Atajo | Modo | Comportamiento |
|---|---|---|
| `F9` | Push-to-Talk | Mantenga presionado para grabar, suelte para transcribir |
| `F10` | Alternar | Presione una vez para iniciar, presione de nuevo para detener |
| `F11` | Historial de Voz | Abre el historial de los últimos 10 dictados para reinsertar |

Todos los atajos son **configurables** en Configuración y funcionan en segundo plano con la ventana cerrada.

---

## ◈ Instalación y Configuración

### Requisitos Previos

- **Node.js** 20+
- **npm** 10+
- **Sistema Operativo**: Windows 10/11

### Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar modo desarrollo (hot-reload)
npm run dev
```

### Compilación para Producción

```bash
# Compilar el proyecto
npm run build

# Generar instalador de Windows / ejecutable portable
npx electron-builder --win
# Salida en: dist-build/
```

### Configuración Inicial

1. Abra Vox y vaya a **Configuración**.
2. Seleccione un **Proveedor** (Groq, OpenAI, Azure OpenAI, Ollama o LM Studio).
3. Ingrese su **Clave API** (no requerida para proveedores locales).
4. Elija sus modelos de **STT** y **LLM**.

---

## ◈ Licencia

Este proyecto está bajo la **Licencia MIT**. Consulte el archivo [LICENSE](LICENSE) para más detalles.

---

<div align="center">

Cristóvão Carvalho &nbsp;·&nbsp; **Vox**

</div>
