<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="220" />

# Vox

**Dettatura vocale di precisione, direttamente sul cursore attivo**

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
  <img src="src/assets/Vox - UI.png" alt="Anteprima di Vox" width="850" />
</div>

<br />

## ◈ Cos'è Vox?

**Vox** è un assistente di dettatura vocale basato su intelligenza artificiale per **Windows**, sviluppato con Electron. Rimane silenzioso nella barra delle applicazioni e, quando attivato tramite scorciatoia globale (`F9`/`F10`), cronologia vocale (`F11`) o parola chiave (**"Vox"**), registra la voce, si arresta automaticamente al rilevamento del silenzio, trascrive con **Whisper**, corregge punteggiatura e ortografia tramite LLM e inserisce il testo **direttamente alla posizione del cursore attivo** in qualsiasi applicazione.

> Pensalo come una dettatura a livello di sistema operativo: che tu sia in VS Code, Word, un'email o Slack — pronuncia *"Vox"*, parla e, appena ti fermi, il testo appare dove si trova il cursore.

> **Vox è un'alternativa open-source a [Wispr Flow](https://wisprflow.ai)** — dettatura vocale con IA, scorciatoie globali, **sistema di comandi vocali** hands-free, correzione contestuale, modelli strutturati e inserimento tramite API native Win32.

---

## ◈ Confronto: Vox vs Wispr Flow

| Caratteristica | **Vox** | **Wispr Flow** |
|---|---|---|
| **Modello di Licenza** | 100% Open-Source (MIT), Gratuito | Proprietario / Commerciale |
| **Costo / Piano Gratuito** | Gratuito per l'uso quotidiano (Groq/OpenAI/locali) | Limitato a 2.000 parole/sett (Pro: $9 - $29+/mese) |
| **Attivazione Vocale** | Parola chiave "Vox" + scorciatoie + comandi | Dipende da scorciatoie/cloud |
| **Scelta del Provider** | Groq, OpenAI, Azure OpenAI, Ollama, LM Studio | Solo cloud proprietario |
| **Privacy** | Chiamate API dirette senza intermediari; registro verificabile | Elaborazione su cloud proprietario |
| **Piattaforme** | Windows | Mac, Windows, iOS |
| **Arresto Automatico (VAD)** | Sì, si arresta e incolla al rilevamento del silenzio | Sì |
| **Correzione Contestuale** | Sì (rileva editor di codice, email, documenti) | No |
| **Modelli di Dettatura** | Sì (email, elenchi puntati, note di riunione, commit…) | No |
| **Comandi Vocali** | Sì (punteggiatura, navigazione, modifica, personalizzati) | No |
| **Vocabolario Personale** | Sì (termini definiti dall'utente inviati al correttore) | No |
| **Cronologia Appunti (F11)** | Sì (ultime 10 dettature reinseribili) | No |

#### Vantaggi

* **100% gratuito e open-source** — nessun abbonamento, codice completamente verificabile.
* **Libertà di scelta** — utilizza Groq, OpenAI, Azure OpenAI o esegui modelli in locale con **Ollama** o **LM Studio** per privacy totale e costo zero.
* **Correzione contestuale** — Vox rileva l'applicazione attiva e adatta la formattazione ("editor di codice" vs "email").
* **Comandi vocali** — detta punteggiatura, comandi di modifica ed esecuzione azioni; crea i tuoi comandi personalizzati.
* **Vocabolario personale** — aggiungi nomi propri, acronimi e gergo tecnico per evitare errori di trascrizione.
* **Registro della privacy** — ogni chiamata API (endpoint, provider, byte inviati) è registrata localmente.
* **Modelli strutturati** — detta direttamente email formattate, elenchi, note e messaggi di commit.

---

## ◈ Scorciatoie Globali

| Scorciatoia | Modalità | Comportamento |
|---|---|---|
| `F9` | Push-to-Talk | Tieni premuto per registrare, rilascia per trascrivere |
| `F10` | Alterna | Premi per iniziare, premi di nuovo per arrestare |
| `F11` | Cronologia | Apre le ultime 10 dettature per reinserirne una |

Tutte le scorciatoie sono **configurabili** nelle Impostazioni.

---

## ◈ Installazione e Avvio

### Prerequisiti

- **Node.js** 20+
- **npm** 10+
- **Sistema Operativo**: Windows 10/11

### Sviluppo

```bash
# Installa le dipendenze
npm install

# Avvia in modalità sviluppo (hot-reload)
npm run dev
```

### Build di Produzione

```bash
# Compila il progetto
npm run build

# Crea l'installer Windows / eseguibile portable
npx electron-builder --win
# Output generato in: dist-build/
```

---

## ◈ Licenza

Questo progetto è rilasciato sotto la **Licenza MIT**. Consulta il file [LICENSE](LICENSE) per ulteriori dettagli.

---

<div align="center">

Cristóvão Carvalho &nbsp;·&nbsp; **Vox**

</div>
