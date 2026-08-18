<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="160" />

# Vox

### The Sovereign Voice Operating Layer for Desktop

*An uncompromising, private, and state-of-the-art voice dictation and workflow automation system engineered for Windows and macOS.*

<br />

[English](README.md) &nbsp;·&nbsp; [Português](README.pt.md) &nbsp;·&nbsp; [Español](README.es.md) &nbsp;·&nbsp; [Français](README.fr.md) &nbsp;·&nbsp; [Deutsch](README.de.md) &nbsp;·&nbsp; [Italiano](README.it.md) &nbsp;·&nbsp; [日本語](README.ja.md) &nbsp;·&nbsp; [简体中文](README.zh-CN.md)

<br />

</div>

---

<div align="center">
  <img src="src/assets/Vox - UI.png" alt="Vox Interface" width="840" />
</div>

<br />

## The Sovereign Alternative to Subscriptions

Commercial voice dictation utilities trap professionals behind monthly paywalls, impose restrictive word quotas, and route intimate thoughts and proprietary source code through external cloud relays.

**Vox is an architectural standard.** Engineered with a minimalist, luxury glassmorphism aesthetic and a high-performance native core, Vox converts natural speech into precision text with Whisper, refines semantic flow and punctuation through your model of choice, and injects the result directly into your active cursor across any native application — with zero subscriptions, zero tracking, and complete privacy.

<br />

---

## Capabilities and Feature Suite

### Native Cross-Platform Execution
Architected natively for **Windows 10/11 (64-bit)** and **macOS (Apple Silicon M-Series & Intel)**. Vox integrates seamlessly with your operating system, respecting native accessibility layers, foreground process detection, and global system shortcuts.

### In-App Local Whisper Management (100% Offline)
Download, manage, and execute Whisper GGML models (Tiny, Base, Small, Medium, Large v3, Distil-Whisper) directly inside the Vox interface. No external Python runtime or terminal setup required. Run entirely offline with zero latency overhead and total cryptographic privacy.

### Bring Your Own Key (BYOK) & Flexible Model Selection
You have complete freedom over which models power your workflow. Connect directly to leading AI inference engines using your own API credentials, or run models locally:
* **Cloud Providers:** Groq, OpenAI, Azure OpenAI, Deepgram, Cerebras, Mistral, Together AI.
* **Local Runtimes:** Ollama, LM Studio, vLLM, LocalAI.
* **Complete Model Freedom:** Select any speech-to-text model and any language model available from your configured provider or local server.

### Intelligent Semantic Refinement
Raw automatic speech recognition often suffers from run-on sentences and acoustic homophones. Vox pairs speech recognition with custom LLM correctors — powered by the model you choose — to automatically insert correct punctuation, capitalize technical acronyms, and balance paragraph cadence.

### Voice Commands & Instant App Launching
Execute desktop automations and operating system actions entirely hands-free. Vox recognizes voice commands to launch and interact with any application on your machine:
* **App Launching:** *"Open VS Code"*, *"Open Chrome"*, *"Open Slack"*, *"Open Terminal"*, *"Open Notes"*, *"Open Calculator"*, or any installed software by name.
* **Web & Knowledge Search:** *"Open Chrome and search React documentation"*, *"Search on YouTube lo-fi beats"*, *"Search quantum computing"*.
* **Navigation & Editing:** *"New line"*, *"New paragraph"*, *"Delete last sentence"*, *"Delete word"*, *"Select all"*, *"Undo"*, *"Copy"*, *"Paste"*.
* **Vox Controls:** *"Code Mode"*, *"Email Mode"*, *"Free Dictation"*, *"Repeat last dictation"*, *"Cancel"*.

### Context-Aware Application Adaptation
Vox inspects the foreground window before transcribing. When you are writing code in VS Code or Terminal, Vox formats identifiers and syntax cleanly. When drafting an email or prose, it produces natural conversational paragraphs.

### Voice Snippets and Expansion
Configure custom text blocks associated with spoken triggers. Saying *"Insert signature"*, *"Insert email address"*, or custom phrases like *"Insert tax ID"* injects pre-formatted multi-line snippets instantaneously without manual typing.

### Dynamic Dictation Templates
Tailor specialized system prompts with custom voice activation triggers. Switch between structured meeting minutes, technical bug reports, bullet summaries, and free prose dynamically through voice commands.

### Hands-Free Wake Word Detection
Powered by embedded ONNX OpenWakeWord neural models running locally. Simply say *"Vox"* to wake the system and start dictating instantly without touching the keyboard.

### Advanced Voice Activity Detection (VAD) & Audio Protection
Integrated energy-based VAD detects natural conversational pauses and automatically finalizes dictation. While you speak, Vox can automatically mute system audio playback to prevent acoustic echo, unmuting seamlessly when you finish.

### Custom Technical Vocabulary
Add personal terms, company names, proprietary codebases, and domain-specific acronyms to your personal dictionary. Vox guarantees consistent spelling across all transcriptions.

### Productivity Dashboard & Contribution Heatmap
Monitor your typing speed acceleration, total words dictated, estimated hours saved, and track your daily dictation consistency through a GitHub-style activity contribution calendar.

### Privacy Vault and Audit Logs
All settings, custom snippets, templates, and dictation histories reside strictly inside an encrypted local SQLite database on your device. Review every outbound API request in the transparent Privacy Logs.

<br />

---

## Architectural Comparison

| Dimension | Vox | Commercial SaaS (Wispr Flow / Superwhisper / Nuance) |
|:---|:---|:---|
| **Licensing** | Open Source (MIT) | Closed Proprietary |
| **Cost** | Free Forever (BYOK / Local) | $180 – $360 / year recurring |
| **Data Privacy** | 100% Local or Direct to API Provider | Routed through intermediary third-party servers |
| **Local Offline Models** | One-Click In-App Download (Whisper) | Often locked to expensive premium tiers |
| **Model Selection** | Total Freedom (Any Cloud or Local LLM/STT) | Restricted to locked proprietary models |
| **Voice Commands & App Launching** | Open Any App, Search Web & Control OS | Basic punctuation only |
| **Platform Support** | Windows 10/11 & macOS (Universal) | Platform-restricted |
| **Custom Vocabulary** | Unlimited Local SQLite Storage | Restricted |
| **Usage Limits** | Unlimited | Hard token/word ceilings |

<br />

---

## Default Shortcuts

| Shortcut (Win / Mac) | Mode | Description |
|:---|:---|:---|
| `F10` / `Control+Space` | **Toggle Dictation** | Press to begin recording; pause or press again to finish and inject text |
| `F9` / `Option+Space` | **Push-to-Talk** | Hold while speaking; release to transcribe and inject instantly |
| `F11` / `Command+Shift+V` | **Clipboard History** | Opens floating overlay to review and re-inject past dictations |
| *"Vox"* | **Voice Wake Word** | Hands-free background activation via local neural wake model |

<br />

---

## Getting Started

### Requirements
* **Windows:** Windows 10 or 11 (64-bit)
* **macOS:** macOS 12 Monterey or newer (Apple Silicon M1/M2/M3/M4 or Intel x64)
* **Node.js:** Node.js 20+ and npm

### Local Development

```bash
# Clone the repository
git clone https://github.com/cristovaocarvalho/Vox.git
cd Vox/code

# Install dependencies
npm install

# Start development environment
npm run dev
```

### Production Packaging

```bash
# Type check and build bundles
npm run build

# Package for Windows (.exe installer)
npm run build:win

# Package for macOS (.dmg and .zip)
npm run build:mac

# Package for macOS Apple Silicon
npm run build:mac:arm64
```

<br />

---

## License

Distributed under the **MIT License**. Created by [Cristovão Carvalho](https://github.com/cristovaocarvalho) and the open-source community.
