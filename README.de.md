<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="220" />

# Vox

**Präzise Sprach-Diktierfunktion, direkt an der Position Ihres aktiven Cursors**

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
  <img src="src/assets/Vox - UI.png" alt="Vox Vorschau" width="850" />
</div>

<br />

## ◈ Was ist Vox?

**Vox** ist ein KI-gestützter Sprach-Diktierassistent für **Windows**, entwickelt mit Electron. Die Anwendung läuft unauffällig im System-Tray. Wird sie über einen globalen Shortcut (`F9`/`F10`), die Zwischenablage-Historie (`F11`) oder das Aktivierungswort (**"Vox"**) ausgelöst, zeichnet sie Ihre Sprache auf, stoppt automatisch bei Stille, transkribiert mit **Whisper**, korrigiert Rechtschreibung und Zeichensetzung über ein LLM und fügt den Text **direkt an der Cursor-Position** jeder beliebigen Anwendung ein.

> Stellen Sie es sich wie ein Diktierwerkzeug auf Betriebssystemebene vor: Egal ob in VS Code, Word, einer E-Mail oder Slack — sagen Sie *"Vox"*, sprechen Sie, und sobald Sie aufhören, erscheint der Text an Ihrem Cursor.

> **Vox ist eine Open-Source-Alternative zu [Wispr Flow](https://wisprflow.ai)** — KI-Sprachdiktat, globale Shortcuts, ein freihändiges **Sprachbefehlssystem**, kontextsensitive Korrektur, strukturierte Vorlagen und Texteinfügung über native Win32-APIs.

---

## ◈ Vergleich: Vox vs Wispr Flow

| Funktion | **Vox** | **Wispr Flow** |
|---|---|---|
| **Lizenzmodell** | 100% Open-Source (MIT), Kostenlos | Proprietär / Kommerziell |
| **Kosten / Gratisplan** | Kostenlose tägliche Nutzung (Groq/OpenAI/lokale Modelle) | Begrenzt auf 2.000 Wörter/Woche (Pro: $9 bis $29+/Monat) |
| **Sprachauslöser** | Aktivierungswort "Vox" + Shortcuts + Sprachbefehle | Nur über Shortcuts/Cloud |
| **KI-Anbieterwahl** | Groq, OpenAI, Azure OpenAI, Ollama, LM Studio | Nur proprietäre Cloud |
| **Datenschutz** | Direkte API-Kommunikation; auditierbares lokales Protokoll | Proprietäre Cloud-Verarbeitung |
| **Plattformen** | Windows | Mac, Windows, iOS |
| **Automatischer Stopp (VAD)** | Ja, stoppt und fügt bei Stille automatisch ein | Ja |
| **Kontextsensitive Korrektur** | Ja (erkennt Code-Editoren, E-Mails, Dokumente) | Nein |
| **Diktat-Vorlagen** | Ja (E-Mails, Aufzählungspunkte, Meeting-Notizen, Commits…) | Nein |
| **Sprachbefehle** | Ja (Zeichensetzung, Navigation, Bearbeitung, benutzerdefiniert) | Nein |
| **Persönliches Vokabular** | Ja (eigene Fachbegriffe werden an den Korrektor übergeben) | Nein |
| **Zwischenablage-Verlauf** | Ja (letzte 10 Diktate per F11 wieder einfügbar) | Nein |

#### Vorteile

* **100% kostenlos und quelloffen** — keine Abos, vollständig überprüfbarer Code.
* **Maximale Flexibilität** — nutzen Sie Groq, OpenAI, Azure OpenAI oder lokale Modelle mit **Ollama** oder **LM Studio** für maximale Privatsphäre ohne Kosten.
* **Kontextbezogene Korrektur** — Vox erkennt das aktive Programm und passt die Formatierung an ("Code-Editor" vs "E-Mail").
* **Sprachbefehlssystem** — diktieren Sie Satzzeichen, Navigationsschritte und Textaktionen oder erstellen Sie eigene Befehle.
* **Persönliches Vokabular** — speichern Sie Fachbegriffe und Eigennamen, damit Whisper diese fehlerfrei erkennt.
* **Datenschutz-Protokoll** — jeder API-Aufruf wird lokal protokolliert und ist jederzeit nachvollziehbar.
* **Strukturierte Vorlagen** — diktieren Sie direkt formatierte E-Mails, Listen, Meeting-Zusammenfassungen und Git-Commits.

---

## ◈ Globale Shortcuts

| Tastenkombination | Modus | Verhalten |
|---|---|---|
| `F9` | Push-to-Talk | Halten zum Aufnehmen, Loslassen zum Transkribieren |
| `F10` | Umschalten | Einmal drücken zum Starten, erneut drücken zum Stoppen |
| `F11` | Diktat-Verlauf | Öffnet die letzten 10 Diktate zur erneuten Verwendung |

Alle Shortcuts können in den Einstellungen **frei konfiguriert** werden.

---

## ◈ Installation & Start

### Voraussetzungen

- **Node.js** 20+
- **npm** 10+
- **Betriebssystem**: Windows 10/11

### Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsmodus starten (Hot-Reload)
npm run dev
```

### Produktions-Build

```bash
# Projekt kompilieren
npm run build

# Windows Installer / portable .exe erstellen
npx electron-builder --win
# Ausgabe in: dist-build/
```

---

## ◈ Lizenz

Dieses Projekt ist unter der **MIT-Lizenz** lizenziert. Weitere Details finden Sie in der Datei [LICENSE](LICENSE).

---

<div align="center">

Cristóvão Carvalho &nbsp;·&nbsp; **Vox**

</div>
