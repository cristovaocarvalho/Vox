<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="220" />

# Vox

**Ditado por voz com precisão, diretamente no seu cursor**

[![Electron](https://img.shields.io/badge/Electron-33-black?style=flat-square&logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-18-black?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-black?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Groq](https://img.shields.io/badge/Groq-Whisper%20V3%20Turbo-black?style=flat-square)](https://groq.com)
[![Platform](https://img.shields.io/badge/Platform-Windows-black?style=flat-square&logo=windows&logoColor=white)](https://microsoft.com/windows)
[![License](https://img.shields.io/badge/License-MIT-black?style=flat-square)](LICENSE)

</div>

---

## ◈ O que é o Vox

**Vox** é um assistente de ditado por voz nativo para Windows, construído com Electron. Ele fica silenciosamente na bandeja do sistema e, quando acionado por atalho global (`F9`/`F10`) ou pela palavra de ativação (**"Vox"**), grava sua fala, encerra automaticamente ao detectar silêncio, transcreve via **Whisper Large V3 Turbo** (Groq API), corrige automaticamente a pontuação via LLM e injeta o texto **diretamente no cursor ativo** de qualquer aplicação, sem precisar que a aplicação tenha suporte especial.

> Pense nele como um ditado de sistema operacional: você está no VS Code, no Word, em um formulário web, no Slack, não importa. Fale *"Vox"*, diga seu texto e, ao parar de falar, a transcrição aparece onde o cursor estava.

> **Vox é uma alternativa open-source ao [WhisperFlow](https://whisperflow.app)**, com a mesma proposta de ditado por voz com IA, suporte a atalhos globais, comando de voz hands-free, pipeline de correção e injeção de texto via Win32 nativo.


---

## ◈ Para que serve

| Caso de uso | Descrição |
|---|---|
| **Ditado por voz** | Fale *"Vox"* ou use atalhos para digitar em qualquer aplicação Windows |
| **Transcrição de mídia** | Transcreva vídeos do YouTube, TikTok, Instagram ou arquivos locais |
| **Exportação de legendas** | Exporte transcrições em `.srt`, `.vtt`, `.txt`, `.md`, `.json` |
| **Produtividade** | Escreva emails, código, documentos sem tocar no teclado |

---

## ◈ Funcionalidades

```
◆  Ditado em tempo real via comando de voz ("Vox"), F9 (Push-to-Talk) ou F10 (Toggle)
◆  Detecção de palavra de ativação ("Vox") 100% offline via ONNX Runtime (< 1% CPU)
◆  Encerramento automático de gravação ao parar de falar com injeção direta no cursor
◆  Injeção de texto no cursor ativo de qualquer janela Windows
◆  Transcrição via Whisper Large V3 Turbo (Groq API)
◆  Correção automática de pontuação e ortografia via LLM
◆  Dock flutuante com visualizador de energia de voz (VAD)
◆  Download e transcrição de vídeos do YouTube, TikTok, Instagram
◆  Suporte a arquivos locais (MP4, MP3, WAV, MKV, MOV, M4A...)
◆  Exportação em SRT, VTT, TXT, MD, JSON
◆  Inicia automaticamente com o Windows
◆  Vive na bandeja do sistema, atalhos e comando de voz funcionam mesmo com app "fechado"
◆  Configurações persistidas em SQLite local
◆  Design premium com glassmorphism, beams animados e micro-animações
```

---

## ◈ Arquitetura

O Vox segue a arquitetura padrão do Electron com separação clara entre **processo principal** (Node.js), **processo renderer** (React) e **preload** (bridge segura de IPC).

```
+---------------------------------------------------------------+
|                      PROCESSO PRINCIPAL                        |
|                       (electron/main.ts)                       |
|                                                                |
|  +----------+  +----------+  +----------+  +------------+    |
|  | Recorder |  |   STT    |  |Corrector |  |  Injector  |    |
|  | (VAD/WAV)|  |  (Groq)  |  |  (LLM)   |  |(PowerShell)|    |
|  +----------+  +----------+  +----------+  +------------+    |
|                                                                |
|  +----------+  +----------+  +--------------------------+    |
|  |Downloader|  |    DB    |  |  GlobalShortcut (F9/F10)  |    |
|  | (yt-dlp) |  | (SQLite) |  |  + SystemTray             |    |
|  +----------+  +----------+  +--------------------------+    |
|                                                                |
|                    IPC (ipcMain / ipcRenderer)                 |
+----------------------------+-----------------------------------+
                             |
                +------------+-----------+
                |         PRELOAD         |
                |     (preload.ts)         |
                |  contextBridge / API     |
                +------------+-----------+
                             |
+----------------------------+-----------------------------------+
|                    PROCESSO RENDERER                            |
|                                                                |
|  +---------------------------+  +---------------------------+ |
|  |      MainWindow            |  |        DockWindow          | |
|  |  (React + Framer Motion)   |  |  (Floating HUD, always-   | |
|  |                            |  |   on-top, showInactive)    | |
|  |  Tab: Ditado por voz       |  |  Visualizador de energia   | |
|  |  Tab: Transcricao midia    |  |  de voz em tempo real      | |
|  |  Modal: Configuracoes      |  +---------------------------+ |
|  +---------------------------+                                 |
|                     Zustand (estado global)                     |
+---------------------------------------------------------------+
```

---

## ◈ Módulos do Processo Principal

### `electron/main.ts`, Orquestrador
Ponto de entrada do processo principal. Gerencia:
- Criação e ciclo de vida das janelas (`MainWindow`, `DockWindow`)
- Registro dos atalhos globais (`F9`, `F10`)
- Tray icon para manter o processo vivo mesmo com janelas fechadas
- Registro no startup do Windows (`app.setLoginItemSettings`)
- Captura do HWND da janela ativa antes de iniciar a gravação
- Todos os handlers IPC (`ipcMain.handle`)

### `electron/modules/recorder.ts`, Gravador de Áudio
`AudioRecorder` estende `EventEmitter`. Recebe chunks PCM 16kHz mono do renderer via IPC, calcula energia RMS (Voice Activity Detection) e monta o buffer WAV completo com header RIFF ao parar a gravação.

```
PCM chunks (IPC) → RMS VAD → Buffer WAV (header + dados)
```

### `electron/modules/stt.ts`, Speech-to-Text
Transcreve o buffer WAV usando a **Groq API** com modelo `whisper-large-v3-turbo`. Detecta automaticamente se o áudio é WebM ou WAV. Possui filtro de alucinações comuns do Whisper (ex: "Obrigado por assistir").

```
Buffer WAV → FormData → Groq API (Whisper V3 Turbo) → texto bruto
```

### `electron/modules/corrector.ts`, Corretor LLM
Passa o texto transcrito por um LLM via Groq Chat API para corrigir pontuação, maiúsculas e ortografia **sem alterar o idioma original**. Modelo padrão: `openai/gpt-oss-20b`.

```
texto bruto → Groq LLM (system prompt estrito) → texto revisado
```

### `electron/modules/injector.ts`, Injetor de Texto
Injeta o texto no cursor ativo de qualquer aplicação Windows:

1. Copia o texto para a área de transferência (`clipboard.writeText`)
2. Aguarda 100ms
3. Restaura o foco para a janela original via `SetForegroundWindow(hwnd)` (Win32 API via PowerShell inline C#)
4. Simula `Ctrl+V` com `System.Windows.Forms.SendKeys::SendWait`

O HWND é capturado no momento exato em que `F9`/`F10` é pressionado, antes de qualquer mudança de foco.

```
clipboard → SetForegroundWindow(hwnd) → SendWait('^v') → texto no cursor
```

### `electron/modules/downloader.ts`, Downloader de Mídia
Usa `yt-dlp` (binário bundled) para baixar áudio de URLs do YouTube, TikTok e Instagram. Suporta autenticação via cookies do browser (Chrome, Edge, Firefox, Brave). Emite progresso em tempo real via IPC.

```
URL → yt-dlp → arquivo de áudio local → transcrição
```

### `electron/modules/db.ts`, Persistência
Banco de dados SQLite via `better-sqlite3`. Armazena configurações do usuário (`apiKey`, modelos, atalhos, cookies). Possui fallback para JSON caso o módulo nativo não carregue.

```
Configurações → SQLite (userData) | fallback JSON
```

---

## ◈ Interface, Design System

O Vox usa um design system proprietário construído em React + CSS puro com inspiração em glassmorphism e interfaces de alta tecnologia.

### Paleta

```
Background principal:  #0D0D0F  (quase preto)
Surface:               rgba(255,255,255,0.04) com blur
Borda:                 rgba(255,255,255,0.08)
Acento primário:       branco puro (#FFFFFF)
Texto secundário:      rgba(255,255,255,0.5)
Destaque de fala:      verde (#22c55e) durante gravação
```

### Componentes

| Componente | Descrição |
|---|---|
| `Beams` | Animação de feixes de luz no background (WebGL/Canvas) |
| `KineticGrid` | Grade cinética interativa com partículas |
| `LiquidGlassCard` | Card com efeito glassmorphism e blur |
| `SpecularButton` | Botão com reflexo especular e micro-animações |
| `SpotlightNavbar` | Navbar com efeito spotlight no hover |
| `SmoothInput` | Input com transições suaves e estados visuais |
| `ShortcutInput` | Captura de atalhos de teclado |
| `AnimatedContent` | Wrapper de animações de entrada via Framer Motion |
| `ProgressBar` | Barra de progresso animada |
| `Drawer` | Painel lateral com slide-in |
| `Badge` | Badge de status |
| `Tooltip` | Tooltip acessível |
| `Combobox` | Seletor com busca |

### Janelas

**MainWindow** (1040×820px, não redimensionável)
- Navbar com tabs: **Ditado por Voz** · **Transcrição de Mídia**
- Tab de ditado: exibe o último transcript, controles de gravação, nível de energia
- Tab de mídia: input de URL, drag-and-drop de arquivo, progresso de download, exportação
- Modal de configurações: API Key, modelos STT/LLM, atalhos, browser para cookies

**DockWindow** (220×70px, `alwaysOnTop: screen-saver`)
- HUD flutuante no centro-inferior da tela
- Aparece apenas durante a gravação
- Exibe visualizador de energia de voz em tempo real
- `showInactive()`, não rouba o foco de nenhuma janela

---

## ◈ Fluxo de Ditado por Voz

```
1. F9 pressionado
   ├── captureActiveWindow() → HWND da janela em foco (ex: VS Code = 12345)
   ├── showDock() com showInactive() → sem roubar foco
   └── IPC → renderer inicia captura de áudio (Web Audio API)

2. Durante gravação
   ├── Chunks PCM → IPC → recorder.processAudioChunk()
   ├── RMS energy → IPC → DockWindow visualiza nível de voz
   └── F9 mantido pressionado (Push-to-Talk)

3. F9 solto (180ms debounce)
   ├── hideDock()
   └── IPC → renderer envia buffer de áudio

4. Processamento no main process
   ├── transcribeAudio(buffer) → Groq Whisper → texto bruto
   ├── correctTranscription(texto) → Groq LLM → texto revisado
   └── injectText(texto, hwnd=12345)
          ├── clipboard.writeText(texto)
          ├── SetForegroundWindow(12345) → VS Code volta ao foco
          └── SendKeys('^v') → texto aparece no cursor do VS Code

5. IPC → MainWindow exibe o transcript
```

---

## ◈ Atalhos Globais

| Atalho | Modo | Comportamento |
|---|---|---|
| `F9` | Push-to-Talk | Segura para gravar, solta para transcrever |
| `F10` | Toggle | Uma vez para iniciar, outra para parar |

Os atalhos funcionam **mesmo com todas as janelas fechadas**, pois o processo permanece vivo na bandeja do sistema (`Tray`).

---

## ◈ Stack Tecnológica

```
Runtime:         Electron 33 (Chromium + Node.js)
UI:              React 18 + TypeScript 5.7
Bundler:         electron-vite (Vite 5 para renderer)
Animações:       Framer Motion 12, GSAP 3, Three.js, @react-three/fiber
Estado:          Zustand 5
Banco de dados:  better-sqlite3 (SQLite nativo)
Wake Word:       openWakeWord ONNX (onnxruntime-node)
STT:             Groq API, whisper-large-v3-turbo (fixo)
LLM:             Groq API, openai/gpt-oss-20b (fixo)
Download:        yt-dlp (binário bundled)
Injeção:         PowerShell + Win32 API (SetForegroundWindow, SendKeys)
Build:           electron-builder (NSIS installer + portable)
```

---

## ◈ Estrutura do Projeto

```
vox/
├── electron/                  # Processo principal (Node.js)
│   ├── main.ts               # Orquestrador, janelas, IPC, tray, shortcuts
│   ├── preload.ts            # Bridge IPC segura (contextBridge)
│   └── modules/
│       ├── recorder.ts       # Gravador PCM + VAD Auto-Stop + WAV builder
│       ├── stt.ts            # Speech-to-Text via Groq Whisper
│       ├── corrector.ts      # Correção de texto via Groq LLM
│       ├── injector.ts       # Injeção de texto no cursor ativo
│       ├── downloader.ts     # Download de mídia via yt-dlp
│       ├── db.ts             # Persistência SQLite / JSON
│       └── wakeword.ts       # Detecção da palavra de ativação "Vox" via ONNX
│
├── src/                       # Processo renderer (React)
│   ├── windows/
│   │   ├── MainWindow/        # Janela principal (ditado + mídia + config)
│   │   └── DockWindow/        # HUD flutuante de gravação
│   ├── components/            # Design system
│   ├── stores/
│   │   └── useVoxStore.ts     # Estado global (Zustand)
│   ├── assets/                # Imagens e ícones
│   └── index.css              # Estilos globais
│
├── resources/
│   ├── binaries/              # yt-dlp e outros binários bundled
│   └── models/                # Modelos locais ONNX de Wake Word
│
├── docs/                      # Imagens e assets de documentação
├── electron-builder.yml       # Config de build e empacotamento
├── electron-vite.config.ts    # Config do bundler
└── package.json
```

---

## ◈ Instalação e Configuração

### Pré-requisitos
- **Node.js** 20+
- **npm** 10+
- **Windows** 10/11 (64-bit)

### Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar em modo desenvolvimento (hot-reload)
npm run dev
```

### Build de produção

```bash
# Compilar
npm run build

# Empacotar (gera installer NSIS + portable)
npx electron-builder
# Output em: dist-build/
```

### Variáveis de ambiente (`.env`)

```env
GROQ_API_KEY=gsk_...          # Chave da API Groq (obrigatória)
```

---

## ◈ Configurações Disponíveis

| Configuração | Padrão | Descrição |
|---|---|---|
| API Key | N/A | Chave da API Groq (obrigatória para STT e LLM) |
| Wake Word | `Ativado ("Vox")` | Acionamento por comando de voz "Vox" hands-free em background |
| Sensibilidade | `50%` | Sensibilidade de detecção da palavra "Vox" |
| Atalho Toggle | `F10` | Ativar/desativar gravação manualmente |
| Atalho Push-to-Talk | `F9` | Gravar enquanto segurar a tecla |
| Cookies do Browser | `chrome` | Para download de vídeos de mídia privada |
| Modelo STT | `whisper-large-v3-turbo` | Modelo fixo de transcrição via Groq API |
| Modelo LLM | `openai/gpt-oss-20b` | Modelo fixo de correção de texto via Groq API |

---

## ◈ Formatos de Exportação (Transcrição de Mídia)

| Formato | Extensão | Uso |
|---|---|---|
| Texto plano | `.txt` | Leitura simples |
| Markdown | `.md` | Documentação |
| SubRip | `.srt` | Legendas em players de vídeo |
| WebVTT | `.vtt` | Legendas na web (HTML5) |
| JSON | `.json` | Integração com outras ferramentas |

---

<div align="center">

Cristóvão Carvalho &nbsp;·&nbsp; **Vox** &nbsp;·&nbsp; v1.5.0

</div>
