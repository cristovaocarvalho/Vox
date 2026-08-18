<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="160" />

# Vox

### Dettatura Vocale IA ad Alta Precisione — Direttamente sul Cursore Attivo

*Un sistema di dettatura vocale privato, open-source e progettato per Windows.*

<br />

[Italiano](README.it.md) &nbsp;·&nbsp; [English](README.md) &nbsp;·&nbsp; [Português](README.pt.md) &nbsp;·&nbsp; [Español](README.es.md) &nbsp;·&nbsp; [Français](README.fr.md) &nbsp;·&nbsp; [Deutsch](README.de.md) &nbsp;·&nbsp; [简体中文](README.zh-CN.md) &nbsp;·&nbsp; [日本語](README.ja.md)

<br />

</div>

---

<div align="center">
  <img src="src/assets/Vox - UI.png" alt="Interfaccia di Vox" width="820" />
</div>

<br />

## Perché Vox

I software commerciali di dettatura impongono abbonamenti ricorrenti, limitano le parole giornaliere e instradano le registrazioni su server terzi per addestrare i propri modelli.

**Vox rappresenta un cambio di paradigma architetturale.** Offre un'esperienza di dettatura a livello di sistema operativo, trascrivendo l'audio con Whisper, perfezionando la punteggiatura tramite modelli linguistici e inserendo il testo formattato direttamente alla posizione del cursore attivo in qualsiasi applicazione Windows.

<br />

## Principi Fondamentali

### Totale Autonomia Architetturale (BYOK)
Connettiti direttamente ai principali provider di inferenza — inclusi Groq, OpenAI e Azure OpenAI — usando le tue chiavi API, o esegui tutto al 100% in locale e offline con **Ollama** e **LM Studio**. Nessun intermediario, nessuna telemetria e nessuna conservazione dei dati.

### Precisione Multilingue Nativa
Progettato per riconoscere e formattare la dettatura in **8 lingue principali** — Italiano, Inglese, Portoghese, Spagnolo, Francese, Tedesco, Cinese Mandarino e Giapponese — senza traduzioni forzate.

### Correzione Semantica Sensibile al Contesto
Vox analizza l'applicazione attiva. Sia che tu stia scrivendo codice in un IDE, rispondendo a un'email o prendendo appunti, il correttore adatta sintassi, maiuscole e punteggiatura al contesto.

### Inserimento Immediato sul Cursore
Avvia la dettatura tramite scorciatoie globali (`F10` / `F9`) o comando vocale (*"Vox"*). Il rilevatore di silenzio (VAD) riconosce il termine della frase e inserisce istantaneamente il testo al cursore.

### Gratuito e Open Source
Rilasciato sotto licenza MIT. Privo di abbonamenti, limiti artificiali o costi nascosti.

<br />

---

## Confronto

| Dimensione | Vox | Soluzioni Commerciali |
|:---|:---|:---|
| **Licenza** | Open Source (MIT) | Proprietaria / Commerciale |
| **Costo** | Gratuito e Libero | $180 – $360 all'anno |
| **Flusso Dati** | Diretto al Provider o 100% Locale | Instradato su server terzi |
| **Inferenza Offline** | Supportata (Ollama / LM Studio) | Non supportata |
| **Limite Parole** | Illimitato | Quote contingentate |
| **Modelli Vocali** | Famiglia Whisper completa + Qualsiasi LLM | Modelli chiusi |
| **Inserimento Cursore** | Iniezione Nativa Win32 | Variabile |

<br />

---

## Scorciatoie Globali

| Scorciatoia | Modalità | Azione |
|:---|:---|:---|
| `F10` | **Alterna** | Premi per iniziare; premi di nuovo o fai silenzio per inserire |
| `F9` | **Push-to-Talk** | Tieni premuto mentre parli; rilascia per inserire |
| `F11` | **Cronologia** | Accedi alle ultime dettature per reinserimento rapido |
| *"Vox"* | **Parola Chiave** | Attivazione vocale hands-free |

<br />

---

## Guida Rapida

### Prerequisiti
* Windows 10 o 11 (64-bit)
* [Node.js](https://nodejs.org) (v20+) e npm

### Installazione

```bash
# Clona il repository
git clone https://github.com/tuo-username/vox.git
cd vox/code

# Installa le dipendenze
npm install

# Avvia l'ambiente di sviluppo
npm run dev
```

### Build di Produzione

```bash
npm run build:win
```

<br />

---

## Licenza

Distribuito sotto la **Licenza MIT**. Consulta il file [LICENSE](LICENSE) per tutti i dettagli.

<div align="center">
<br />

Cristóvão Carvalho &nbsp;·&nbsp; **Vox**

</div>
