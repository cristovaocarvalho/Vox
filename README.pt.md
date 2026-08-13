<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="220" />

# Vox

**Ditado por voz com precisão, diretamente no seu cursor**

<br />

[![Read in English](https://img.shields.io/badge/Read_in-English-blue?style=for-the-badge&logo=github)](README.md)

<br />

[![Electron](https://img.shields.io/badge/Electron-33-black?style=flat-square&logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-18-black?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-black?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Groq](https://img.shields.io/badge/Groq-Whisper%20V3%20Turbo-black?style=flat-square)](https://groq.com)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-black?style=flat-square&logo=electron&logoColor=white)](https://electronjs.org)
[![License](https://img.shields.io/badge/License-MIT-black?style=flat-square)](LICENSE)

</div>

---

<div align="center">
  <img src="src/assets/preview.png" alt="Vox Interface Preview" width="850" />
</div>

<br />

## ◈ O que é o Vox

**Vox** é um assistente de ditado por voz multiplataforma (Windows, macOS e Linux), construído com Electron. Ele fica silenciosamente na bandeja do sistema e, quando acionado por atalho global (`F9`/`F10`) ou pela palavra de ativação (**"Vox"**), grava sua fala, encerra automaticamente ao detectar silêncio, transcreve via **Whisper Large V3 Turbo**, corrige automaticamente a pontuação via LLM e injeta o texto **diretamente no cursor ativo** de qualquer aplicação, sem precisar que a aplicação tenha suporte especial.

> Pense nele como um ditado de sistema operacional: você está no VS Code, no Word, em um formulário web, no Slack, não importa. Fale *"Vox"*, diga seu texto e, ao parar de falar, a transcrição aparece onde o cursor estava.

> **Vox é uma alternativa open-source ao [Wispr Flow](https://wisprflow.ai)**, com a mesma proposta de ditado por voz com IA, suporte a atalhos globais, comando de voz hands-free, pipeline de correção e injeção de texto via Win32 e APIS nativas.


---

## ◈ Comparativo: Vox vs Wispr Flow

O **Wispr Flow** é uma solução comercial proprietária que oferece um plano gratuito restrito (limitado a uma cota de 2.000 palavras por semana) e planos pagos por assinatura mensal ($9/mês a $29+/mês). O **Vox** foi criado como uma alternativa aberta, 100% gratuita no uso diário com provedores como a Groq (que oferece um plano gratuito generoso com milhares de requisições por dia), multiplataforma, focada em privacidade e controle do usuário.

### Tabela Comparativa

| Recurso / Característica | **Vox** | **Wispr Flow** |
|---|---|---|
| **Modelo de Licenciamento** | 100% Open-Source (MIT), Gratuito | Proprietário / Comercial |
| **Plano Gratuito / Custo** | 100% Gratuito no dia a dia (via Free Tier da Groq API) | Grátis limitado a 2.000 palavras/semana (Pro: $9 a $29+/mês) |
| **Wake Word (Comando de Voz)** | Sim, "Vox" (100% offline via ONNX) | Depende de atalhos/nuvem |
| **Privacidade** | Áudio processado via API direta, sem intermediários | Processamento em nuvem proprietária |
| **Plataformas** | Windows (.exe), macOS (.dmg) e Linux (.AppImage) | Mac, Windows, iOS |
| **Encerramento Automático (VAD)** | Sim, encerra e cola automaticamente ao silenciar | Sim |

#### Vantagens do Vox

* **100% Gratuito e Open-Source**: Sem mensalidades recorrentes, código totalmente auditável e transparente.
* **Uso Praticamente Ilimitado e Gratuito**: Ao utilizar provedores como a Groq API (que disponibilizam um plano gratuito generoso com milhares de requisições por dia), você utiliza o Vox no dia a dia sem travas ou cotas semanais de palavras, ao contrário do limite de 2.000 palavras do Wispr Flow.
* **Wake Word Offline ("Vox")**: Detecção da palavra de ativação processada 100% localmente no PC via ONNX Runtime (< 1% CPU).
* **Privacidade de Dados**: O seu áudio é enviado diretamente para a API do seu provedor de preferência, sem intermediários ou retendo dados para treinamento.

#### Desvantagens do Vox

* **Necessita de Chave de API**: Exige que o usuário insira sua própria API Key nas configurações (ex: obtida gratuitamente na Groq).
* **Modelos STT/LLM Fixos**: O provedor de API deve disponibilizar os modelos `whisper-large-v3-turbo` e `openai/gpt-oss-20b`.
* **Dispositivos Móveis**: Atualmente focado em sistemas de desktop (Windows, macOS e Linux), sem aplicativo dedicado para iOS/Android.


---

## ◈ Para que serve

| Caso de uso | Descrição |
|---|---|
| **Ditado por voz** | Fale *"Vox"* ou use atalhos para digitar em qualquer aplicação |
| **Produtividade** | Escreva emails, código, documentos sem tocar no teclado |

---

## ◈ Funcionalidades

```
◆  Ditado em tempo real via comando de voz ("Vox"), F9 (Push-to-Talk) ou F10 (Toggle)
◆  Detecção de palavra de ativação ("Vox") 100% offline via ONNX Runtime (< 1% CPU)
◆  Encerramento automático de gravação ao parar de falar com injeção direta no cursor
◆  Injeção de texto no cursor ativo de qualquer janela ativa
◆  Transcrição via Whisper Large V3 Turbo (Groq ou qualquer provedor compatível)
◆  Correção automática de pontuação e ortografia via LLM (openai/gpt-oss-20b)
◆  Dock flutuante com visualizador de energia de voz (VAD) e animações suaves
◆  Inicia automaticamente com o sistema (toggle configurável pelo usuário)
◆  Vive na bandeja do sistema, atalhos e comando de voz funcionam mesmo com app "fechado"
◆  Configurações persistidas em SQLite local com encriptação safeStorage a nível de SO para as chaves de API
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
|  +----------+  +--------------------------------------------+    |
|  |    DB    |  |  GlobalShortcut (F9/F10)                   |    |
|  | (SQLite) |  |  + SystemTray                              |    |
|  +----------+  +--------------------------------------------+    |
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
|  |  Modal: Configuracoes      |  |  de voz em tempo real      | |
|  +---------------------------+  +---------------------------+ |
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
- Registro no startup do sistema (`app.setLoginItemSettings`)
- Captura do HWND da janela ativa antes de iniciar a gravação
- Todos os handlers IPC (`ipcMain.handle`)

### `electron/modules/recorder.ts`, Gravador de Áudio
`AudioRecorder` estende `EventEmitter`. Recebe chunks PCM 16kHz mono do renderer via IPC, calcula energia RMS (Voice Activity Detection) e monta o buffer WAV completo com header RIFF ao parar a gravação de forma otimizada.

```
PCM chunks (IPC) → RMS VAD → Buffer WAV (header + dados)
```

### `electron/modules/stt.ts`, Speech-to-Text
Transcreve o buffer WAV usando a API do provedor escolhido (Groq API ou compatível) com o modelo `whisper-large-v3-turbo`. Detecta automaticamente se o áudio é WebM ou WAV. Possui filtro de alucinações comuns do Whisper (ex: "Obrigado por assistir").

```
Buffer WAV → FormData → API (Whisper V3 Turbo) → texto bruto
```

### `electron/modules/corrector.ts`, Corretor LLM
Passa o texto transcrito por um LLM via Chat API do provedor para corrigir pontuação, maiúsculas e ortografia **sem alterar o idioma original**. Modelo padrão: `openai/gpt-oss-20b`.

```
texto bruto → LLM (system prompt estrito) → texto revisado
```

### `electron/modules/injector.ts`, Injetor de Texto
Injeta o texto no cursor ativo de qualquer aplicação:

1. Copia o texto para a área de transferência (`clipboard.writeText`)
2. Aguarda 100ms
3. Restaura o foco para a janela original via `SetForegroundWindow(hwnd)`
4. Simula `Ctrl+V` com `System.Windows.Forms.SendKeys::SendWait`

O HWND é capturado no momento exato em que `F9`/`F10` é pressionado, antes de qualquer mudança de foco.

```
clipboard → SetForegroundWindow(hwnd) → SendWait('^v') → texto no cursor
```

### `electron/modules/db.ts`, Persistência
Banco de dados SQLite via `better-sqlite3`. Armazena configurações do usuário (`apiKey`, modelos, atalhos). Utiliza encriptação nativa do sistema operacional (`safeStorage`) para a API Key e possui fallback para JSON caso o módulo nativo do sqlite falhe em carregar.

---

## ◈ Interface, Design System

O Vox usa um design system proprietário construído em React + CSS puro com inspiração em layouts com glassmorphism e interfaces elegantes em modo escuro.

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
| `LiquidGlassCard` | Card com efeito glassmorphism e blur |
| `SpecularButton` | Botão com reflexo especular e micro-animações |
| `SmoothInput` | Input com transições suaves e estados visuais |
| `ShortcutInput` | Captura de atalhos de teclado |
| `AnimatedContent` | Wrapper de animações de entrada via Framer Motion |
| `Badge` | Badge de status |
| `NoiseTexture` | Overlay de ruído dinâmico com máscaras radiais |

### Janelas

**MainWindow** (1040×820px, não redimensionável)
- Ditado por Voz: exibe o último transcript, histórico de ditados e botão de configurações.
- Painel de configurações: Chave de API, atalhos de gravação, sensibilidade da Wake Word e toggle de iniciar com o sistema.

**DockWindow** (220×70px, `alwaysOnTop: screen-saver`)
- HUD flutuante no centro-inferior da tela.
- Aparece apenas durante a gravação com animações suaves de entrada/saída.
- Exibe visualizador de energia de voz em tempo real.

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
Animações:       Framer Motion 12, GSAP 3
Estado:          Zustand 5
Banco de dados:  better-sqlite3 (SQLite nativo)
Wake Word:       openWakeWord ONNX (onnxruntime-node)
STT:             Whisper Large V3 Turbo (via provedor de API)
LLM:             openai/gpt-oss-20b (via provedor de API)
Injeção:         PowerShell + Win32 API (SetForegroundWindow, SendKeys)
Build:           electron-builder (Windows .exe, macOS .dmg, Linux .AppImage)
```

---

## ◈ Instalação e Configuração

### Pré-requisitos
- **Node.js** 20+
- **npm** 10+
- **Sistema Operacional**: Windows 10/11, macOS ou Linux

### Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar em modo desenvolvimento (hot-reload)
npm run dev
```

### Build de produção

```bash
# Compilar projeto
npm run build

# Empacotar executáveis (gera Windows .exe, macOS .dmg e Linux .AppImage)
npx electron-builder --win --mac --linux
# Output em: dist-build/
```

### Variáveis de ambiente (`.env`)

```env
GROQ_API_KEY=gsk_...          # Chave de API do provedor (deve disponibilizar os modelos whisper-large-v3-turbo e openai/gpt-oss-20b)
```

---

## ◈ Configurações Disponíveis

| Configuração | Padrão | Descrição |
|---|---|---|
| API Key | N/A | Chave de API (salva de forma segura utilizando o safeStorage do sistema operacional) |
| Wake Word | `Ativado ("Vox")` | Acionamento por comando de voz "Vox" hands-free em background |
| Sensibilidade | `50%` | Sensibilidade de detecção da palavra "Vox" |
| Atalho Toggle | `F10` | Ativar/desativar gravação manualmente |
| Atalho Push-to-Talk | `F9` | Gravar enquanto segurar a tecla |
| Iniciar com o Sistema | `Ativado` | Executar o Vox automaticamente após login no sistema |
| Modelo STT | `whisper-large-v3-turbo` | Modelo fixo de transcrição (deve ser disponibilizado pelo provedor de API) |
| Modelo LLM | `openai/gpt-oss-20b` | Modelo fixo de correção (deve ser disponibilizado pelo provedor de API) |

---

## ◈ Licença

Este projeto está licenciado sob a Licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

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
