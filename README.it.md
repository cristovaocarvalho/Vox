<div align="center">

<img src="src/assets/logo.png" alt="Logo Vox" width="160" />

# Vox

### Il Livello Operativo Sovrano di Dettatura Vocale per Desktop

*Un sistema di dettatura vocale e automazione dei flussi di lavoro senza compromessi, privato e all'avanguardia, progettato per Windows e macOS.*

<br />

[English](README.md) &nbsp;·&nbsp; [Português](README.pt.md) &nbsp;·&nbsp; [Español](README.es.md) &nbsp;·&nbsp; [Français](README.fr.md) &nbsp;·&nbsp; [Deutsch](README.de.md) &nbsp;·&nbsp; [Italiano](README.it.md) &nbsp;·&nbsp; [日本語](README.ja.md) &nbsp;·&nbsp; [简体中文](README.zh-CN.md)

<br />

</div>

---

<div align="center">
  <img src="src/assets/Vox - UI.png" alt="Interfaccia di Vox" width="840" />
</div>

<br />

## L'Alternativa Sovrana agli Abbonamenti

I tradizionali software commerciali di dettatura vincolano i professionisti a canoni mensili continui, impongono tetti rigidi di parole e instradano pensieri privati e codice riservato attraverso server di terze parti.

**Vox stabilisce un nuovo standard ingegneristico.** Progettato con un'estetica glassmorphism minimalista e lussuosa, e alimentato da un motore nativo ad altissime prestazioni, Vox converte la voce in testo accurato con Whisper, perfeziona la punteggiatura e la coerenza semantica attraverso il modello di intelligenza artificiale di tua scelta e inserisce il testo formattato direttamente sul cursore attivo in qualsiasi applicazione — senza abbonamenti, senza tracciamento e con totale riservatezza.

<br />

---

## Suite Completa di Funzionalità

### Esecuzione Nativa Multipiattaforma
Sviluppato nativamente per **Windows 10/11 (64-bit)** e **macOS (Apple Silicon M1/M2/M3/M4 e Intel)**. Vox si integra profondamente con il sistema operativo, garantendo accessibilità nativa, rilevamento delle finestre in primo piano e scorciatoie globali.

### Gestore Whisper Locale Integrato (100% Offline)
Scarica, configura ed esegui i modelli Whisper GGML (Tiny, Base, Small, Medium, Large v3, Distil-Whisper) direttamente dall'interfaccia di Vox con 1 clic. Nessuna configurazione complessa di Python. Lavora completamente offline con zero latenza e sovranità crittografica assoluta.

### Usa le Tue Chiavi API (BYOK) & Totale Libertà di Modello
Hai il controllo assoluto sui modelli che guidano la tua produttività. Collegati direttamente ai principali provider di inferenza IA con le tue credenziali o sfrutta server locali:
* **Provider Cloud:** Groq, OpenAI, Azure OpenAI, Deepgram, Cerebras, Mistral, Together AI.
* **Ambienti Locali:** Ollama, LM Studio, vLLM, LocalAI.
* **Scelta Senza Limiti:** Scegli liberamente qualsiasi modello vocale (STT) e qualsiasi modello di linguaggio (LLM) disponibile sul tuo provider o server locale.

### Perfezionamento Semantico e Correzione Intelligente
Il riconoscimento vocale grezzo genera spesso testi privi di punteggiatura o con errori omofoni. Vox affianca alla trascrizione correttori neurali intelligenti — basati sul modello linguistico da te scelto — per inserire punteggiatura elegante, calibrare le maiuscole e preservare la fluidità naturale del parlato.

### Comandi Vocali & Apertura Istantanea delle Applicazioni
Esegui automazioni complete del sistema operativo senza toccare la tastiera. Vox riconosce i comandi vocali per aprire qualsiasi programma installato sul tuo computer:
* **Apertura App:** *"Apri VS Code"*, *"Apri Chrome"*, *"Apri Slack"*, *"Apri Terminale"*, *"Apri Blocco Note"*, *"Apri Calcolatrice"*, o qualsiasi applicazione per nome.
* **Ricerca Web e Conoscenza:** *"Apri Chrome e cerca documentazione React"*, *"Cerca su YouTube musica rilassante"*, *"Cerca fisica quantistica"*.
* **Navigazione ed Editing:** *"Nuova riga"*, *"Nuovo paragrafo"*, *"Cancella ultima frase"*, *"Cancella parola"*, *"Seleziona tutto"*, *"Annulla"*, *"Copia"*, *"Incolla"*.
* **Controlli Vox:** *"Modalità Codice"*, *"Modalità Testo"*, *"Modalità Email"*, *"Dettatura libera"*, *"Ripeti ultima dettatura"*, *"Annulla"*.

### Adattamento Intelligente al Contesto dell'Applicazione
Vox ispeziona la finestra attiva prima di trascrivere. Quando scrivi codice in VS Code o nel Terminale, Vox formatta correttamente identificatori e sintassi. Quando componi un'email o un articolo, produce paragrafi naturali e scorrevoli.

### Snippet di Testo Vocali
Configura blocchi di testo frequenti associati a comandi vocali. Pronunciare *"La mia firma"*, *"Inserisci email"*, *"Il mio indirizzo"* o frasi personalizzate inserisce istantaneamente testi multilinea preformattati.

### Modelli di Dettatura Personalizzati (Templates)
Crea modelli con istruzioni di formattazione e parole chiave di attivazione dedicate. Passa da verbali di riunione a relazioni tecniche o sintesi in elenchi puntati pronunciando semplicemente il nome del template.

### Attivazione Vocale a Mani Libere (*"Vox"*)
Supportato da modelli neurali locali ONNX OpenWakeWord. Pronuncia *"Vox"* in qualsiasi momento per svegliare il sistema e iniziare a dettare senza toccare la tastiera.

### Rilevamento Attività Vocale (VAD) e Protezione Audio
L'algoritmo VAD integrato individua le pause naturali e conclude la dettatura automaticamente. Durante il parlato, Vox può silenziare l'audio del computer per eliminare i ritorni sonori, ripristinandolo al termine.

### Vocabolario Tecnico Personalizzato
Aggiungi nomi propri, termini specialistici della tua azienda e acronimi al tuo dizionario personale per garantire una grafia sempre accurata e coerente.

### Dashboard di Produttività e Mappa di Attività
Monitora l'incremento della velocità di digitazione, il totale delle parole dettate, le ore risparmiate e visualizza la tua costanza giornaliera con una mappa termica in stile GitHub.

### Cassaforte di Privacy e Log Trasparenti
Tutte le impostazioni, gli snippet, i modelli e la cronologia rimangono esclusivamente in un database SQLite locale sul tuo computer. Ispeziona ogni chiamata API nei registri di trasparenza.

<br />

---

## Confronto Architetturale

| Dimensione | Vox | Soluzioni Commerciali SaaS |
|:---|:---|:---|
| **Licenza** | Open Source (MIT) | Proprietaria Chiusa |
| **Costo** | Gratuito per Sempre (BYOK / Locale) | 180 € – 360 € / anno ricorrenti |
| **Privacy dei Dati** | 100% Locale o Diretto alle API | Dati inviati a server di terze parti |
| **Modelli Locali Offline** | Download con 1 Clic nell'App (Whisper) | Spesso bloccati in piani costosi |
| **Scelta dei Modelli** | Libertà Totale (Qualsiasi Cloud/Local LLM) | Modelli vincolati e chiusi |
| **Comandi Vocali e Apertura App** | Apre Qualsiasi App, Cerca sul Web & Controlla SO | Solo punteggiatura di base |
| **Supporto Multipiattaforma** | Windows 10/11 & macOS (Universale) | Limitato a un solo sistema |
| **Vocabolario Personalizzato** | Illimitato in SQLite Locale | Ristretto |
| **Limiti di Utilizzo** | Illimitato | Tetti mensili vincolanti |

<br />

---

## Scorciatoie Predefinite

| Scorciatoia (Win / Mac) | Modalità | Descrizione |
|:---|:---|:---|
| `F10` / `Control+Space` | **Attiva/Disattiva Dettatura** | Premi per iniziare; fai una pausa o ripremi per inserire il testo |
| `F9` / `Option+Space` | **Push-to-Talk** | Tieni premuto mentre parli; rilascia per trascrivere e inserire |
| `F11` / `Command+Shift+V` | **Cronologia Appunti** | Apre la finestra mobile per consultare e reinserire dettature passate |
| *"Vox"* | **Parola di Attivazione** | Attivazione a mani libere in background tramite modello neurale locale |

<br />

---

## Guida Introduttiva

### Requisiti
* **Windows:** Windows 10 o 11 (64-bit)
* **macOS:** macOS 12 Monterey o successivo (Apple Silicon M1/M2/M3/M4 o Intel x64)
* **Node.js:** Node.js 20+ e npm

### Sviluppo Locale

```bash
# Clona il repository
git clone https://github.com/cristovaocarvalho/Vox.git
cd Vox/code

# Installa le dipendenze
npm install

# Avvia l'ambiente di sviluppo
npm run dev
```

### Compilazione e Rilascio

```bash
# Verifica dei tipi e compilazione
npm run build

# Crea pacchetto per Windows (.exe)
npm run build:win

# Crea pacchetto per macOS (.dmg e .zip)
npm run build:mac

# Crea pacchetto per Apple Silicon
npm run build:mac:arm64
```

<br />

---

## Licenza

Distribuito sotto licenza **MIT**. Creato da [Cristovão Carvalho](https://github.com/cristovaocarvalho) e dalla community open source.
