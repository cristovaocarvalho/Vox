<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="160" />

# Vox

### Präzises KI-Sprachdiktat — Direkt an Ihrer aktiven Cursorposition

*Ein kompromissloses, privates und quelloffenes Diktiersystem für Windows.*

<br />

[Deutsch](README.de.md) &nbsp;·&nbsp; [English](README.md) &nbsp;·&nbsp; [Português](README.pt.md) &nbsp;·&nbsp; [Español](README.es.md) &nbsp;·&nbsp; [Français](README.fr.md) &nbsp;·&nbsp; [简体中文](README.zh-CN.md) &nbsp;·&nbsp; [日本語](README.ja.md) &nbsp;·&nbsp; [Italiano](README.it.md)

<br />

</div>

---

<div align="center">
  <img src="src/assets/Vox - UI.png" alt="Vox Benutzeroberfläche" width="820" />
</div>

<br />

## Warum Vox

Herkömmliche Diktieranwendungen verlangen monatliche Abonnements, begrenzen das Wortvolumen und leiten vertrauliche Audiodaten über proprietäre Cloud-Server weiter.

**Vox setzt auf eine unabhängige Architektur.** Es bietet ein Diktiererlebnis auf Betriebssystemebene, transkribiert Sprache über Whisper, veredelt Zeichensetzung mit modernen Sprachmodellen und fügt formatierten Text direkt am aktiven Cursor in jeder Windows-Anwendung ein.

<br />

## Kernprinzipien

### Vollständige Architektonische Autonomie (BYOK)
Verbinden Sie sich direkt mit führenden Inferenz-Anbietern — darunter Groq, OpenAI und Azure OpenAI — über Ihre eigenen API-Schlüssel, oder betreiben Sie Vox vollständig lokal und offline mit **Ollama** und **LM Studio**. Keine Zwischenserver, keine Telemetrie, keine Datenspeicherung.

### Native Mehrsprachige Präzision
Entwickelt für nahtlose Erkennung und Formatierung in **8 Hauptsprachen** — Deutsch, Englisch, Portugiesisch, Spanisch, Französisch, Mandarin, Japanisch und Italienisch — ohne erzwungene Übersetzungen.

### Kontextsensitive Semantische Korrektur
Vox analysiert die aktive Anwendungsumgebung. Ob beim Schreiben von Quellcode in einer IDE, beim Verfassen geschäftlicher E-Mails oder beim Notieren kurzer Gedanken: Die Korrektur passt Zeichensetzung, Groß- und Kleinschreibung präzise an.

### Nahtlose Cursor-Einfügung
Starten Sie das Diktat über globale Tastenkombinationen (`F10` / `F9`) oder per Sprachbefehl (*"Vox"*). Die integrierte Spracherkennung (VAD) beendet die Aufnahme bei Sprechpausen und fügt den fertigen Text sofort am Cursor ein.

### Uneingeschränkt und Quelloffen
Veröffentlicht unter der MIT-Lizenz. Frei von Abogebühren, künstlichen Limits und versteckten Kosten.

<br />

---

## Vergleich

| Dimension | Vox | Proprietäre Lösungen |
|:---|:---|:---|
| **Lizenz** | Open Source (MIT) | Proprietär / Kommerziell |
| **Kosten** | Kostenlos und Frei | 180 $ bis 360 $ jährlich |
| **Datenfluss** | Direkt zum Anbieter oder 100% Lokal | Über fremde Server geroutet |
| **Offline-Inferenz** | Unterstützt (Ollama / LM Studio) | Nicht verfügbar |
| **Wortbegrenzung** | Unbegrenzt | Begrenzte Kontingente |
| **Modellauswahl** | Komplette Whisper-Familie + Beliebige LLMs | Geschlossene Modelle |
| **Einfügung** | Native Win32-Cursor-Injektion | Variabel |

<br />

---

## Globale Tastenkombinationen

| Shortcut | Modus | Aktion |
|:---|:---|:---|
| `F10` | **Umschalten** | Drücken zum Starten; erneut drücken oder still sein zum Einfügen |
| `F9` | **Push-to-Talk** | Halten während des Sprechens; Loslassen zum Einfügen |
| `F11` | **Verlauf** | Öffnet die letzten Diktate zur schnellen Wiederverwendung |
| *"Vox"* | **Aktivierungswort** | Berührungslose Aktivierung per Sprache |

<br />

---

## Erste Schritte

### Voraussetzungen
* Windows 10 oder 11 (64-Bit)
* [Node.js](https://nodejs.org) (v20+) und npm

### Installation

```bash
# Repository klonen
git clone https://github.com/ihr-benutzername/vox.git
cd vox/code

# Abhängigkeiten installieren
npm install

# Entwicklungsumgebung starten
npm run dev
```

### Produktions-Build

```bash
npm run build:win
```

<br />

---

## Lizenz

Veröffentlicht unter der **MIT-Lizenz**. Siehe [LICENSE](LICENSE) für den vollständigen Lizenztext.

<div align="center">
<br />

Cristóvão Carvalho &nbsp;·&nbsp; **Vox**

</div>
