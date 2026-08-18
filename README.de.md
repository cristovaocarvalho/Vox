<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="160" />

# Vox

### Die Souveräne Sprachbedienungsebene für den Desktop

*Ein kompromissloses, privates und hochmodernes Sprachdiktiersystem und Workflow-Automatisierungswerkzeug, entwickelt für Windows und macOS.*

<br />

[English](README.md) &nbsp;·&nbsp; [Português](README.pt.md) &nbsp;·&nbsp; [Español](README.es.md) &nbsp;·&nbsp; [Français](README.fr.md) &nbsp;·&nbsp; [Deutsch](README.de.md) &nbsp;·&nbsp; [Italiano](README.it.md) &nbsp;·&nbsp; [日本語](README.ja.md) &nbsp;·&nbsp; [简体中文](README.zh-CN.md)

<br />

</div>

---

<div align="center">
  <img src="src/assets/Vox - UI.png" alt="Vox Benutzeroberfläche" width="840" />
</div>

<br />

## Die Souveräne Alternative zu Abonnements

Herkömmliche kommerzielle Sprachdiktierprogramme binden Fachleute an monatliche Gebühren, erzwingen künstliche Wortkontingente und leiten vertrauliche Gedanken sowie Quellcode über Drittanbieter-Server weiter.

**Vox ist ein architektonischer Meilenstein.** Entwickelt in eleganter Glassmorphism-Ästhetik und angetrieben von einem nativen Hochleistungskern, wandelt Vox gesprochene Sprache mit Whisper in präzisen Text um, verfeinert die Grammatik und Zeichensetzung über das Sprachmodell Ihrer Wahl und fügt das formatierte Ergebnis direkt an der aktiven Cursorposition in jeder Anwendung ein — ohne Abonnements, ohne Tracking und mit vollständiger Privatsphäre.

<br />

---

## Funktionsumfang

### Native Plattformübergreifende Ausführung
Nativ entwickelt für **Windows 10/11 (64-Bit)** und **macOS (Apple Silicon M1/M2/M3/M4 & Intel)**. Vox integriert sich nahtlos in das Betriebssystem, unterstützt barrierefreie Schnittstellen, erkennt Vordergrundprozesse und reagiert auf globale Tastenkürzel.

### Integrierte Lokale Whisper-Verwaltung (100% Offline)
Laden Sie Whisper GGML-Modelle (Tiny, Base, Small, Medium, Large v3, Distil-Whisper) mit nur einem Klick direkt über die Vox-Oberfläche herunter und führen Sie diese aus. Keine externe Python-Installation erforderlich. Arbeiten Sie vollständig offline mit null Latenz und absoluter kryptografischer Datensouveränität.

### Eigene Schlüssel Nutzen (BYOK) & Freie Modellwahl
Sie haben die uneingeschränkte Kontrolle darüber, welche Modelle Ihre Produktivität antreiben. Verbinden Sie sich direkt mit führenden KI-Inferenzanbietern oder nutzen Sie lokale Server:
* **Cloud-Anbieter:** Groq, OpenAI, Azure OpenAI, Deepgram, Cerebras, Mistral, Together AI.
* **Lokale Laufzeiten:** Ollama, LM Studio, vLLM, LocalAI.
* **Vollständige Modellfreiheit:** Wählen Sie jedes beliebige Spracherkennungsmodell (STT) und Sprachmodell (LLM) Ihres Providers oder lokalen Servers.

### Intelligente Semantische Verfeinerung
Reine Spracherkennung leidet häufig unter fehlender Zeichensetzung und akustischen Fehlinterpretationen. Vox kombiniert die Transkription mit intelligenten LLM-Korrektoren — angetrieben vom Sprachmodell Ihrer Wahl —, um Satzzeichen präzise zu setzen und Groß-/Kleinschreibung perfekt abzustimmen.

### Sprachbefehle & Sofortiger App-Start
Führen Sie Desktop-Automatisierungen und Betriebssystemaktionen vollständig freihändig aus. Vox erkennt Sprachbefehle, um jedes installierte Programm auf Ihrem Computer direkt zu öffnen:
* **Apps Öffnen:** *"VS Code öffnen"*, *"Chrome öffnen"*, *"Slack öffnen"*, *"Terminal öffnen"*, *"Notizen öffnen"*, *"Rechner öffnen"*, oder jedes installierte Programm beim Namen.
* **Websuche:** *"Chrome öffnen und nach React-Dokumentation suchen"*, *"Auf YouTube nach Lo-Fi Beats suchen"*, *"Nach Quantenphysik suchen"*.
* **Navigation & Bearbeitung:** *"Neue Zeile"*, *"Neuer Absatz"*, *"Letzten Satz löschen"*, *"Wort löschen"*, *"Alles auswählen"*, *"Rückgängig"*, *"Kopieren"*, *"Einfügen"*.
* **Vox-Steuerung:** *"Code-Modus"*, *"Text-Modus"*, *"E-Mail-Modus"*, *"Freies Diktat"*, *"Letztes Diktat wiederholen"*, *"Abbrechen"*.

### Kontextbezogene Anwendungsanpassung
Vox analysiert das aktive Fenster vor der Transkription. Beim Schreiben von Code in VS Code oder im Terminal formatiert Vox Bezeichner und Syntax sauber. Beim Verfassen von E-Mails oder Dokumenten entstehen fließende Absätze.

### Sprachgesteuerte Textbausteine (Snippets)
Hinterlegen Sie wiederkehrende Textblöcke mit gesprochenen Auslösern. Das Aussprechen von *"Meine Signatur"*, *"E-Mail einfügen"* oder *"Meine Adresse"* fügt vorformatierte mehrzeilige Texte sofort ein.

### Benutzerdefinierte Diktatvorlagen (Templates)
Erstellen Sie maßgeschneiderte System-Prompts mit individuellen Sprachaktivierungsauslösern. Wechseln Sie per Sprachbefehl zwischen Besprechungsprotokollen, Fehlerberichten und freiem Fließtext.

### Freihändige Aktivierung per Weckwort (*"Vox"*)
Angetrieben von lokalen neuronalen ONNX OpenWakeWord-Modellen. Sagen Sie einfach *"Vox"*, um das System ohne Berührung der Tastatur aufzuwecken und das Diktat zu starten.

### Sprachaktivitätserkennung (VAD) & Audioschutz
Der integrierte VAD-Algorithmus erkennt natürliche Sprechpausen und schließt das Diktat automatisch ab. Während Sie sprechen, kann Vox die System-Audioausgabe stummschalten, um Echos zu vermeiden, und aktiviert den Ton nach dem Diktat wieder.

### Technisches Fachvokabular
Fügen Sie Eigennamen, Firmenjargon und Programmierabkürzungen zu Ihrem persönlichen Wörterbuch hinzu, um eine konsistente Schreibweise sicherzustellen.

### Produktivitäts-Dashboard & Beitragsdiagramm
Verfolgen Sie Ihre Tippbeschleunigung, die Gesamtzahl der diktierten Wörter, die eingesparten Stunden und visualisieren Sie Ihre tägliche Aktivität über ein Diagramm im GitHub-Stil.

### Datenschutz-Tresor & Transparente Protokolle
Alle Einstellungen, Vorlagen und Diktatverläufe verbleiben ausschließlich in einer lokalen SQLite-Datenbank auf Ihrem Gerät. Jede API-Anfrage kann transparent im Datenschutzprotokoll überprüft werden.

<br />

---

## Architekturvergleich

| Dimension | Vox | Kommerzielle SaaS-Lösungen |
|:---|:---|:---|
| **Lizenz** | Open Source (MIT) | Proprietär / Kommerziell |
| **Kosten** | Dauerhaft Kostenlos (BYOK / Lokal) | 180 € – 360 € / Jahr wiederkehrend |
| **Datenschutz** | 100% Lokal oder Direkt zum Anbieter | Datenfluss über Drittanbieter-Server |
| **Lokale Offline-Modelle** | 1-Klick-Download in der App (Whisper) | Meist an teure Abos gebunden |
| **Modellauswahl** | Vollständige Freiheit (Jedes Cloud/Local LLM) | Starr vorgegebene Modelle |
| **Sprachbefehle & App-Start** | Öffnet Beliebige Apps, Websuche & Systemsteuerung | Nur einfache Satzzeichen |
| **Plattformunterstützung** | Windows 10/11 & macOS (Universal) | Auf ein System beschränkt |
| **Eigenes Vokabular** | Unbegrenzt in lokaler SQLite-DB | Eingeschränkt |
| **Nutzungslimits** | Unbegrenzt | Strenge Wortbegrenzungen |

<br />

---

## Standard-Tastenkürzel

| Tastenkürzel (Win / Mac) | Modus | Beschreibung |
|:---|:---|:---|
| `F10` / `Control+Space` | **Diktat Umschalten** | Drücken zum Starten; Pause oder erneutes Drücken fügt den Text ein |
| `F9` / `Option+Space` | **Push-to-Talk** | Während des Sprechens gedrückt halten; loslassen zum Einfügen |
| `F11` / `Command+Shift+V` | **Verlauf** | Öffnet das Overlay zur Ansicht und erneuten Nutzung früherer Diktate |
| *"Vox"* | **Weckwort** | Freihändige Aktivierung im Hintergrund über lokales KI-Modell |

<br />

---

## Erste Schritte

### Voraussetzungen
* **Windows:** Windows 10 oder 11 (64-Bit)
* **macOS:** macOS 12 Monterey oder neuer (Apple Silicon M1/M2/M3/M4 oder Intel x64)
* **Node.js:** Node.js 20+ und npm

### Lokale Entwicklung

```bash
# Repository klonen
git clone https://github.com/cristovaocarvalho/Vox.git
cd Vox/code

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev
```

### Produktiv-Builds Erstellen

```bash
# Typprüfung und Bundle-Kompilierung
npm run build

# Windows-Installer erstellen (.exe)
npm run build:win

# macOS-Paket erstellen (.dmg und .zip)
npm run build:mac

# macOS Apple Silicon Build
npm run build:mac:arm64
```

<br />

---

## Lizenz

Veröffentlicht unter der **MIT-Lizenz**. Entwickelt von [Cristovão Carvalho](https://github.com/cristovaocarvalho) und der Open-Source-Community.
