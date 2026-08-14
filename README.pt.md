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
[![Platform](https://img.shields.io/badge/Platform-Windows-black?style=flat-square&logo=electron&logoColor=white)](https://electronjs.org)
[![License](https://img.shields.io/badge/License-MIT-black?style=flat-square)](LICENSE)

</div>

---

<div align="center">
  <img src="src/assets/preview.png" alt="Vox Interface Preview" width="850" />
</div>

<br />

## ◈ O que é o Vox

**Vox** é um assistente de ditado por voz para **Windows**, construído com Electron. Ele fica silenciosamente na bandeja do sistema e, quando acionado por atalho global (`F9`/`F10`), pelo histórico de voz (`F11`) ou pela palavra de ativação (**"Vox"**), grava sua fala, encerra automaticamente ao detectar silêncio, transcreve via **Whisper**, corrige pontuação e ortografia com um LLM e injeta o texto **diretamente no cursor ativo** de qualquer aplicação.

> Pense nele como um ditado de sistema operacional: você está no VS Code, no Word, num email ou no Slack — fale *"Vox"*, diga seu texto e, ao parar de falar, a transcrição aparece onde o cursor estava.

> **Vox é uma alternativa open-source ao [Wispr Flow](https://wisprflow.ai)** — ditado por voz com IA, atalhos globais, um **sistema de comandos de voz** hands-free, correção contextual, templates estruturados e injeção de texto via APIs nativas do Win32.

---

## ◈ Comparativo: Vox vs Wispr Flow

| Recurso / Característica | **Vox** | **Wispr Flow** |
|---|---|---|
| **Modelo de Licenciamento** | 100% Open-Source (MIT), Gratuito | Proprietário / Comercial |
| **Plano Gratuito / Custo** | Gratuito no dia a dia (Groq/OpenAI/modelos locais) | Grátis limitado a 2.000 palavras/semana (Pro: $9 a $29+/mês) |
| **Acionamento por voz** | Palavra "Vox" + atalhos + comandos de voz | Depende de atalhos/nuvem |
| **Escolha de provedor** | Groq, OpenAI, Azure OpenAI, Ollama, LM Studio | Apenas nuvem proprietária |
| **Privacidade** | API direta, sem intermediário; registro de privacidade auditável | Nuvem proprietária |
| **Plataformas** | Windows | Mac, Windows, iOS |
| **Encerramento Automático (VAD)** | Sim, encerra e cola ao silenciar | Sim |
| **Correção contextual** | Sim (detecção de editor de código / email / documento) | Não |
| **Templates de ditado** | Sim (email, tópicos, notas de reunião, commits…) | Não |
| **Comandos de voz** | Sim (pontuação, edição, sistema, personalizados) | Não |
| **Vocabulário pessoal** | Sim (termos do usuário enviados ao corretor) | Não |
| **Histórico de voz (clipboard)** | Sim (últimos 10 ditados, reinseríveis) | Não |

#### Vantagens

* **100% gratuito e open-source** — sem mensalidades, código totalmente auditável.
* **Liberdade de provedor** — use Groq, OpenAI, Azure OpenAI, ou rode 100% local com **Ollama**/**LM Studio** para custo zero e privacidade total.
* **Correção contextual** — o Vox detecta o app ativo e adapta a correção ("em um editor de código" vs "em um email").
* **Sistema de comandos de voz** — fale pontuação, navegação, edição e comandos de sistema; crie os seus próprios.
* **Histórico de padrões** — após 25 sessões, o Vox aprende sozinho suas correções recorrentes.
* **Vocabulário pessoal** — adicione nomes próprios, siglas e jargões para o Whisper nunca errar.
* **Registro de privacidade** — cada chamada de API (endpoint, provedor, bytes enviados) é registrada localmente e auditável.
* **Templates estruturados** — dite diretamente em emails formatados, listas, notas de reunião, mensagens de commit e mais.

#### Limitações

* **Necessita de provedor** — provedores de nuvem exigem sua própria API Key; provedores locais rodam inteiramente na sua máquina.
* **Somente Windows** — o suporte a macOS e Linux foi removido para focar numa experiência Windows estável.

---

## ◈ Para que serve

| Caso de uso | Descrição |
|---|---|
| **Ditado por voz** | Fale *"Vox"* ou use atalhos para digitar em qualquer aplicação |
| **Produtividade** | Escreva emails, código e documentos sem tocar no teclado |
| **Comandos de voz** | Fale pontuação e comandos ("nova linha", "apagar palavra", "desfazer") |
| **Saída estruturada** | Dite diretamente em templates (tópicos, notas de reunião, commits) |

---

## ◈ Funcionalidades

```
◆  Ditado em tempo real via palavra de ativação ("Vox"), F9 (Push-to-Talk) ou F10 (Toggle)
◆  Prévia progressiva (streaming) da transcrição durante a gravação
◆  Encerramento automático no silêncio com injeção direta no cursor
◆  Suporte a múltiplos provedores: Groq, OpenAI, Azure OpenAI, Ollama, LM Studio
◆  Seleção de modelos — escolha seus modelos STT e LLM do provedor
◆  Correção contextual por LLM baseada na aplicação ativa
◆  Vocabulário pessoal (nomes próprios, siglas, jargões)
◆  Correção por histórico de padrões — aprende correções após 25 sessões
◆  Sistema de comandos de voz (pontuação, navegação, edição, controle, sistema)
◆  Comandos e snippets personalizados
◆  Templates de ditado estruturado (email, listas, notas de reunião, commits, …)
◆  Histórico de voz (F11) — reinsira qualquer um dos últimos 10 ditados
◆  Registro de privacidade auditável (endpoint, provedor, bytes por chamada)
◆  Dock flutuante com visualizador de energia de voz em tempo real
◆  Bandeja do sistema (atalhos e palavra de ativação funcionam com o app fechado)
◆  Inicia com o Windows (configurável)
◆  Persistência em SQLite com encriptação safeStorage para as chaves de API
◆  UI premium em glassmorphism (Playfair Display + IBM Plex Sans)
```

---

## ◈ Arquitetura

O Vox segue a arquitetura padrão do Electron separando o **Processo Principal** (Node.js), o **Processo Renderer** (React) e o **Preload** (bridge segura de IPC).

O pipeline de ditado é:

```
STT → Parser de Comandos → [ Executor de Comandos | Corretor LLM (+ template) ] → Injetor
```

```
+---------------------------------------------------------------------+
|                       PROCESSO PRINCIPAL                             |
|                        (electron/main.ts)                            |
|                                                                      |
|  +----------+  +----------+  +-----------+  +-------------------+   |
|  | Recorder |  |   STT    |  | Corrector |  | Command Parser    |   |
|  | (VAD/WAV)|  | (Whisper)|  |  (LLM)    |  | (tokenizer/matcher)|  |
|  +----------+  +----------+  +-----------+  +-------------------+   |
|                                                                      |
|  +-------------+  +----------------+  +-------------------------+   |
|  | Command     |  | Template       |  | Injector (PowerShell)   |   |
|  | Executor    |  | Manager        |  | SetForegroundWindow +   |   |
|  | (ações)     |  | (ditado)       |  | SendKeys                |   |
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
|                      PROCESSO RENDERER                               |
|  +---------------------------+  +---------------------------+       |
|  |      MainWindow            |  |        DockWindow          |       |
|  |  (React + Framer Motion)   |  |  (HUD flutuante, always-  |       |
|  |  Ditado + Configurações    |  |   on-top, showInactive)    |       |
|  +---------------------------+  +---------------------------+       |
|  +---------------------------+                                      |
|  |      ClipboardWindow      |                                      |
|  |  (histórico de voz)        |                                      |
|  +---------------------------+                                      |
|                     Zustand (estado global)                          |
+----------------------------------------------------------------------+
```

---

## ◈ Módulos do Processo Principal

| Módulo | Finalidade |
|---|---|
| `main.ts` | Orquestrador — janelas, atalhos, bandeja, pipeline, handlers IPC |
| `recorder.ts` | Gravador — VAD, auto-stop no silêncio, buffer WAV |
| `stt.ts` | Speech-to-Text via o provedor configurado (Whisper) |
| `corrector.ts` | Correção por LLM — contexto, vocabulário, histórico de padrões, templates |
| `commandParser.ts` | Tokenizador + classificador + matcher (comandos isolados/inline) |
| `commandExecutor.ts` | Executa ações (teclas, injeção, apps, scripts) |
| `commandRegistry.ts` | Comandos padrão (PT/EN) + comandos personalizados |
| `snippetManager.ts` | CRUD de snippets |
| `templateRegistry.ts` | Templates de ditado padrão |
| `templateManager.ts` | Ciclo de vida de templates + ativação por voz + prompt do corretor |
| `providers.ts` | Resolução multi-provedor (Groq, OpenAI, Azure, Ollama, LM Studio) |
| `injector.ts` | Injeção via clipboard + `SetForegroundWindow` + `SendKeys` |
| `db.ts` | Persistência SQLite (configurações, sessões, comandos, snippets, templates, logs) |

---

## ◈ Atalhos Globais

| Atalho | Modo | Comportamento |
|---|---|---|
| `F9` | Push-to-Talk | Segure para gravar, solte para transcrever |
| `F10` | Toggle | Uma vez para iniciar, outra para parar |
| `F11` | Histórico de Voz | Abre os últimos 10 ditados para reinserir um |

Todos os atalhos são **configuráveis** nas Configurações e funcionam mesmo com a janela fechada (o Vox permanece na bandeja do sistema).

---

## ◈ Comandos de Voz

O Vox inclui ~56 comandos integrados em português e inglês nas categorias de pontuação, navegação, edição, controle do Vox, snippets e sistema. Exemplos:

| Fale (PT) | Fale (EN) | Ação |
|---|---|---|
| "vírgula" | "comma" | injeta `, ` |
| "nova linha" | "new line" | pressiona Enter |
| "novo parágrafo" | "new paragraph" | Enter duplo |
| "apagar palavra" | "delete word" | Ctrl+Backspace |
| "desfazer" | "undo" | Ctrl+Z |
| "parar" | "stop" | encerra o ditado |
| "inserir data" | "insert date" | insere a data de hoje |
| "abrir terminal" | "open terminal" | abre o terminal |

O modo inline (desativado por padrão) permite comandos dentro do texto ditado, ex.: *"aprovado vírgula nova linha enviar para o cliente"*.

---

## ◈ Stack Tecnológica

```
Runtime:        Electron 33 (Chromium + Node.js)
UI:             React 18 + TypeScript 5.7
Bundler:        electron-vite (Vite 5)
Animações:      Framer Motion 12, GSAP 3
Estado:         Zustand 5
Banco de dados: better-sqlite3 (SQLite nativo)
STT:            Whisper via provedor (Groq/OpenAI/Azure/local)
LLM:            configurável (padrão llama-3.1-8b-instant)
Injeção:        PowerShell + Win32 API (SetForegroundWindow, SendKeys)
Build:          electron-builder (Windows .exe)
```

---

## ◈ Instalação e Configuração

### Pré-requisitos

- **Node.js** 20+
- **npm** 10+
- **Sistema Operacional**: Windows 10/11

### Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar em modo desenvolvimento (hot-reload)
npm run dev
```

### Build de produção

```bash
# Compilar o projeto
npm run build

# Empacotar o instalador / executável portátil do Windows
npx electron-builder --win
# Output em: dist-build/
```

### Configuração

1. Abra o Vox e acesse **Configurações**.
2. Escolha um **Provedor** (Groq, OpenAI, Azure OpenAI, Ollama ou LM Studio).
3. Informe sua **API Key** (não é necessária para provedores locais).
4. Escolha seus modelos **STT** e **LLM** (ou deixe o Vox buscar os disponíveis).

---

## ◈ Configurações Disponíveis

| Configuração | Padrão | Descrição |
|---|---|---|
| Provedor | `Groq` | Groq, OpenAI, Azure OpenAI, Ollama, LM Studio |
| URL Base | (padrão do provedor) | Sobrescreve o endpoint da API |
| API Key | N/A | Chave do provedor (salva via safeStorage do SO) |
| Modelo STT | `whisper-large-v3-turbo` | Modelo de transcrição |
| Modelo LLM | `llama-3.1-8b-instant` | Modelo de correção |
| Atalho Toggle | `F10` | Iniciar/parar gravação |
| Atalho Push-to-Talk | `F9` | Gravar enquanto segurar |
| Atalho do Histórico | `F11` | Histórico de voz (clipboard) |
| Wake Word | `Ativado ("Vox")` | Ativação por voz em segundo plano |
| Modo de Comandos Inline | `Desativado` | Reconhece comandos dentro do texto ditado |
| Idioma | `Português (BR)` | Idioma da UI e dos comandos |
| Iniciar com o Sistema | `Ativado` | Executar ao fazer login |

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
