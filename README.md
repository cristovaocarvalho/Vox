<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="220" />

# Vox

**Precision voice dictation, directly at your active cursor**

<br />

[![Leia em Português](https://img.shields.io/badge/Leia_em-Portugu%C3%AAs-green?style=for-the-badge&logo=github)](README.pt.md)

<br />

[![Electron](https://img.shields.io/badge/Electron-33-black?style=flat-square&logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-18-black?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-black?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Platform](https://img.shields.io/badge/Platform-Windows-black?style=flat-square&logo=electron&logoColor=white)](https://electronjs.org)
[![License](https://img.shields.io/badge/License-MIT-black?style=flat-square)](LICENSE)

</div>

---

<div align="center">
  <img src="src/assets/preview.png" alt="Vox Interface Preview" width="850" />
</div>

<br />

## ◈ What is Vox

**Vox** is a Windows AI-powered voice dictation assistant built with Electron. It lives silently in the system tray and, when triggered by a global shortcut (`F9`/`F10`), the voice clipboard (`F11`), or by saying the wake word (**"Vox"**), records your speech, auto-stops on silence, transcribes via **Whisper**, corrects punctuation and spelling with an LLM, and injects the text **directly into the active cursor** of any application.

> Think of it as OS-level voice dictation: whether you are in VS Code, Word, an email, or Slack — say *"Vox"*, speak, and as soon as you stop talking the text appears at your cursor.

> **Vox is an open-source alternative to [Wispr Flow](https://wisprflow.ai)** — AI voice dictation, global shortcuts, a hands-free **voice command system**, context-aware correction, structured templates, and text injection via native Win32 APIs.

---

## ◈ Comparison: Vox vs Wispr Flow

| Feature / Characteristic | **Vox** | **Wispr Flow** |
|---|---|---|
| **License Model** | 100% Open-Source (MIT), Free | Proprietary / Commercial |
| **Free Plan / Cost** | Free daily use (Groq/OpenAI/local models) | Free limited to 2,000 words/week (Pro: $9 to $29+/mo) |
| **Voice trigger** | Wake word "Vox" + shortcuts + voice commands | Depends on shortcuts/cloud |
| **Provider choice** | Groq, OpenAI, Azure OpenAI, Ollama, LM Studio | Proprietary cloud only |
| **Privacy** | Direct API, no middleman; auditable privacy log | Proprietary cloud processing |
| **Platforms** | Windows | Mac, Windows, iOS |
| **Auto-Stop on Silence (VAD)** | Yes, auto-stops and pastes on silence | Yes |
| **Context-aware correction** | Yes (code editor / email / document detection) | No |
| **Structured dictation templates** | Yes (email, bullet points, meeting notes, commits…) | No |
| **Voice commands** | Yes (punctuation, editing, system, custom) | No |
| **Personal vocabulary** | Yes (user-defined terms fed to the corrector) | No |
| **Voice clipboard history** | Yes (last 10 dictations, re-insertable) | No |

#### Advantages

* **100% free and open-source** — no subscriptions, fully auditable codebase.
* **Provider freedom** — use Groq, OpenAI, Azure OpenAI, or run fully locally with **Ollama**/**LM Studio** for zero cost and total privacy.
* **Context-aware correction** — Vox detects the active app and tailors correction ("in a code editor" vs "in an email").
* **Voice command system** — speak punctuation, navigation, editing, and system commands; create your own.
* **Pattern history** — after 25 sessions Vox learns your recurring corrections automatically.
* **Personal vocabulary** — add proper nouns, acronyms, and jargon so Whisper never mangles them.
* **Privacy log** — every API call (endpoint, provider, bytes sent) is recorded locally and auditable.
* **Structured templates** — dictate straight into formatted emails, lists, meeting notes, commit messages, and more.

#### Limitations

* **Requires a provider** — for cloud providers you enter your own API key; local providers run entirely on your machine.
* **Windows-only** — macOS and Linux support were removed to focus on a stable Windows experience.

---

## ◈ Use Cases

| Use Case | Description |
|---|---|
| **Voice Dictation** | Say *"Vox"* or use shortcuts to type into any application |
| **Productivity** | Write emails, code, and documents hands-free |
| **Voice Commands** | Speak punctuation and commands ("nova linha", "delete word", "undo") |
| **Structured Output** | Dictate straight into templates (bullet points, meeting notes, commit messages) |

---

## ◈ Features

```
◆  Real-time dictation via wake word ("Vox"), F9 (Push-to-Talk), or F10 (Toggle)
◆  Progressive (streaming) transcription preview while recording
◆  Auto-stop on silence (configurable) with instant cursor injection
◆  Multi-provider support: Groq, OpenAI, Azure OpenAI, Ollama, LM Studio
◆  Model selection — pick your STT and LLM models from the provider
◆  Context-aware LLM correction based on the active application
◆  Personal vocabulary memory (proper nouns, acronyms, jargon)
◆  Pattern-history correction — auto-learns recurring fixes after 25 sessions
◆  Voice command system (punctuation, navigation, editing, vox control, system)
◆  Custom voice commands and snippets
◆  Structured dictation templates (email, lists, meeting notes, commits, …)
◆  Voice clipboard history (F11) — re-insert any of the last 10 dictations
◆  Auditable privacy log (endpoint, provider, bytes sent per API call)
◆  Floating Dock HUD with real-time voice energy visualizer
◆  System tray background process (shortcuts and wake word work when closed)
◆  Autostart with Windows (user-configurable)
◆  SQLite persistence with OS-level safeStorage encryption for API keys
◆  Premium glassmorphism UI (Playfair Display + IBM Plex Sans)
```

---

## ◈ Architecture

Vox follows standard Electron architecture separating the **Main Process** (Node.js), **Renderer Process** (React), and **Preload** (secure IPC bridge).

The dictation pipeline is:

```
STT → Command Parser → [ Voice Command Executor | LLM Corrector (+ template) ] → Injector
```

```
+---------------------------------------------------------------------+
|                          MAIN PROCESS                                |
|                         (electron/main.ts)                           |
|                                                                      |
|  +----------+  +----------+  +-----------+  +-------------------+   |
|  | Recorder |  |   STT    |  | Corrector |  | Command Parser    |   |
|  | (VAD/WAV)|  | (Whisper)|  |  (LLM)    |  | (tokenizer/matcher)|  |
|  +----------+  +----------+  +-----------+  +-------------------+   |
|                                                                      |
|  +-------------+  +----------------+  +-------------------------+   |
|  | Command     |  | Template       |  | Injector (PowerShell)   |   |
|  | Executor    |  | Manager        |  | SetForegroundWindow +   |   |
|  | (actions)   |  | (dictation)    |  | SendKeys                |   |
|  +-------------+  +----------------+  +-------------------------+   |
|                                                                      |
|  +----------+  +-----------------------------------------------+    |
|  |    DB    |  | GlobalShortcut (F9/F10/F11) + SystemTray       |    |
|  | (SQLite) |  +-----------------------------------------------+    |
|  +----------+                                                       |
|                                                                      |
|                    IPC (ipcMain / ipcRenderer)                       |
+------------------------------+---------------------------------------+
                               |
                 +-------------+-------------+
                 |           PRELOAD          |
                 |      contextBridge / API  |
                 +-------------+-------------+
                               |
+------------------------------+---------------------------------------+
|                        RENDERER PROCESS                              |
|  +---------------------------+  +---------------------------+       |
|  |      MainWindow            |  |        DockWindow          |       |
|  |  (React + Framer Motion)   |  |  (Floating HUD, always-   |       |
|  |  Dictation + Settings      |  |   on-top, showInactive)    |       |
|  +---------------------------+  +---------------------------+       |
|  +---------------------------+                                      |
|  |      ClipboardWindow      |                                      |
|  |  (voice clipboard history) |                                      |
|  +---------------------------+                                      |
|                     Zustand (global state)                           |
+----------------------------------------------------------------------+
```

---

## ◈ Main Process Modules

| Module | Purpose |
|---|---|
| `main.ts` | Orchestrator — windows, shortcuts, tray, pipeline, IPC handlers |
| `recorder.ts` | Audio recorder — VAD, auto-stop on silence, WAV buffer |
| `stt.ts` | Speech-to-Text via the configured provider (Whisper) |
| `corrector.ts` | LLM correction — context, vocabulary, pattern history, templates |
| `commandParser.ts` | Tokenizer + classifier + matcher (isolated/inline commands) |
| `commandExecutor.ts` | Dispatches command actions (keystrokes, injection, apps, scripts) |
| `commandRegistry.ts` | Default commands (PT/EN) + user custom commands |
| `snippetManager.ts` | Snippet CRUD |
| `templateRegistry.ts` | Default dictation templates |
| `templateManager.ts` | Template lifecycle + voice activation + corrector prompt building |
| `providers.ts` | Multi-provider resolution (Groq, OpenAI, Azure, Ollama, LM Studio) |
| `injector.ts` | Text injection via clipboard + `SetForegroundWindow` + `SendKeys` |
| `db.ts` | SQLite persistence (settings, sessions, commands, snippets, templates, logs) |

---

## ◈ Global Shortcuts

| Shortcut | Mode | Behavior |
|---|---|---|
| `F9` | Push-to-Talk | Hold to record, release to transcribe |
| `F10` | Toggle | Press once to start, press again to stop |
| `F11` | Clipboard History | Open the last 10 dictations to re-insert one |

All shortcuts are **configurable** in Settings and work even when the window is closed (Vox stays in the system tray).

---

## ◈ Voice Commands

Vox ships with ~56 built-in commands in Portuguese and English across punctuation, navigation, editing, Vox control, snippets, and system categories. Examples:

| Speak (PT) | Speak (EN) | Action |
|---|---|---|
| "vírgula" | "comma" | injects `, ` |
| "nova linha" | "new line" | presses Enter |
| "novo parágrafo" | "new paragraph" | double Enter |
| "apagar palavra" | "delete word" | Ctrl+Backspace |
| "desfazer" | "undo" | Ctrl+Z |
| "parar" | "stop" | stops dictation |
| "inserir data" | "insert date" | inserts today's date |
| "abrir terminal" | "open terminal" | opens the terminal |

Inline mode (off by default) lets commands appear inside dictated text, e.g. *"approved comma new line send to client"*.

---

## ◈ Tech Stack

```
Runtime:        Electron 33 (Chromium + Node.js)
UI:             React 18 + TypeScript 5.7
Bundler:        electron-vite (Vite 5)
Animations:     Framer Motion 12, GSAP 3
State:          Zustand 5
Database:       better-sqlite3 (native SQLite)
STT:            Whisper via provider (Groq/OpenAI/Azure/local)
LLM:            configurable (default llama-3.1-8b-instant)
Injection:      PowerShell + Win32 API (SetForegroundWindow, SendKeys)
Build:          electron-builder (Windows .exe)
```

---

## ◈ Installation & Setup

### Prerequisites

- **Node.js** 20+
- **npm** 10+
- **Operating System**: Windows 10/11

### Development

```bash
# Install dependencies
npm install

# Start development mode (hot-reload)
npm run dev
```

### Production Build

```bash
# Compile the project
npm run build

# Package the Windows installer / portable executable
npx electron-builder --win
# Output location: dist-build/
```

### Configuration

1. Launch Vox and open **Settings**.
2. Choose a **Provider** (Groq, OpenAI, Azure OpenAI, Ollama, or LM Studio).
3. Enter your **API Key** (not required for local providers).
4. Pick your **STT** and **LLM** models (or let Vox fetch the available ones).

---

## ◈ Available Settings

| Setting | Default | Description |
|---|---|---|
| Provider | `Groq` | Groq, OpenAI, Azure OpenAI, Ollama, LM Studio |
| Base URL | (provider default) | Override the API endpoint |
| API Key | N/A | Provider key (saved via OS-level safeStorage) |
| STT Model | `whisper-large-v3-turbo` | Transcription model |
| LLM Model | `llama-3.1-8b-instant` | Correction model |
| Toggle Shortcut | `F10` | Start/stop recording |
| Push-to-Talk | `F9` | Record while holding |
| Clipboard Shortcut | `F11` | Voice clipboard history |
| Wake Word | `Enabled ("Vox")` | Background voice activation |
| Inline Command Mode | `Off` | Recognize commands inside dictated text |
| Language | `Português (BR)` | UI + command language |
| Start with System | `Enabled` | Launch on login |

---

## ◈ License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

```text
MIT License

Copyright (c) 2026 Cristóvão Carvalho

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<div align="center">

Cristóvão Carvalho &nbsp;·&nbsp; **Vox**

</div>
