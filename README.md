<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="160" />

# Vox

### Precision AI Voice Dictation — Directly at Your Active Cursor

*An uncompromising, private, and open-source dictation system engineered for Windows.*

<br />

[English](README.md) &nbsp;·&nbsp; [Português](README.pt.md) &nbsp;·&nbsp; [Español](README.es.md) &nbsp;·&nbsp; [Français](README.fr.md) &nbsp;·&nbsp; [Deutsch](README.de.md) &nbsp;·&nbsp; [简体中文](README.zh-CN.md) &nbsp;·&nbsp; [日本語](README.ja.md) &nbsp;·&nbsp; [Italiano](README.it.md)

<br />

</div>

---

<div align="center">
  <img src="src/assets/Vox - UI.png" alt="Vox Interface" width="820" />
</div>

<br />

## Why Vox

Traditional voice dictation software demands recurring monthly subscriptions, enforces artificial word quotas, and routes private audio through third-party proprietary servers.

**Vox is an architectural departure.** It provides an operating-system-level dictation experience, transcribing speech with Whisper, refining punctuation through advanced language models, and streaming formatted text directly into your active cursor across any Windows application — with complete architectural autonomy.

<br />

## Core Principles

### Complete Architectural Autonomy (BYOK)
Connect directly to leading inference providers — including Groq, OpenAI, and Azure OpenAI — using your own API credentials, or run entirely offline using local runtimes like **Ollama** and **LM Studio**. No telemetry, no intermediate servers, and zero data retention.

### Native Multilingual Precision
Engineered to recognize and format dictation naturally across **8 primary languages** — English, Portuguese, Spanish, French, German, Mandarin, Japanese, and Italian — preserving natural phrasing without unwanted translation artifacts.

### Context-Aware Semantic Refinement
Vox analyzes the active application environment. Whether you are drafting source code in an IDE, replying to an email, or composing technical documentation, the corrector adapts punctuation, casing, and formatting accordingly.

### Seamless Cursor Injection
Activate dictation via global hotkeys (`F10` / `F9`) or hands-free voice wake word (*"Vox"*). Integrated Voice Activity Detection (VAD) automatically identifies speech completion and injects polished text instantly at the cursor position.

### Unrestricted and Open Source
Distributed under the MIT License. Free of monthly fees, telemetry paywalls, and synthetic usage constraints.

<br />

---

## Comparison

| Dimension | Vox | Proprietary Solutions |
|:---|:---|:---|
| **Licensing** | Open Source (MIT) | Proprietary / Commercial |
| **Pricing** | Zero Subscription Overhead | $180 – $360 annually |
| **Data Flow** | Direct to Provider or 100% Local | Routed through third-party servers |
| **Local Inference** | Supported (Ollama / LM Studio) | Unsupported |
| **Usage Limits** | Unlimited | Capped tiers |
| **Model Selection** | Full Whisper family + Any LLM | Closed architectures |
| **Text Delivery** | Native Win32 Cursor Injection | Variable |

<br />

---

## Shortcuts

| Shortcut | Mode | Description |
|:---|:---|:---|
| `F10` | **Toggle** | Press to begin dictation; press again or pause speech to insert |
| `F9` | **Push-to-Talk** | Hold to record; release to transcribe and paste |
| `F11` | **History** | Access the recent dictation cache for quick re-insertion |
| *"Vox"* | **Wake Word** | Hands-free background activation |

<br />

---

## Getting Started

### Prerequisites
* Windows 10 or 11 (64-bit)
* [Node.js](https://nodejs.org) (v20+) and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/vox.git
cd vox/code

# Install dependencies
npm install

# Launch development environment
npm run dev
```

### Production Packaging

```bash
npm run build:win
```

<br />

---

## License

Released under the **MIT License**. Refer to [LICENSE](LICENSE) for full legal text.

<div align="center">
<br />

Cristóvão Carvalho &nbsp;·&nbsp; **Vox**

</div>
