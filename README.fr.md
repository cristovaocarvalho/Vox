<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="220" />

# Vox

**Dictée vocale de haute précision, directement à l'emplacement de votre curseur**

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
  <img src="src/assets/Vox - UI.png" alt="Aperçu de Vox" width="850" />
</div>

<br />

## ◈ Qu'est-ce que Vox ?

**Vox** est un assistant de dictée vocale boosté par l'IA pour **Windows**, conçu avec Electron. Il réside discrètement dans la zone de notification système et, lorsqu'il est déclenché par un raccourci global (`F9`/`F10`), l'historique du presse-papier vocal (`F11`) ou le mot clé (**"Vox"**), enregistre votre voix, s'arrête automatiquement lors des silences, transcrit via **Whisper**, corrige la ponctuation et l'orthographe avec un LLM et injecte le texte **directement sous votre curseur actif** dans n'importe quelle application.

> Imaginez une dictée vocale intégrée au système : que vous soyez dans VS Code, Word, vos e-mails ou Slack, dites *"Vox"*, parlez, et dès que vous vous arrêtez, le texte apparaît exactement là où se trouvait votre curseur.

> **Vox est une alternative open-source à [Wispr Flow](https://wisprflow.ai)** — dictée vocale IA, raccourcis globaux, **système de commandes vocales** mains libres, correction contextuelle, modèles structurés et injection native via les API Win32.

---

## ◈ Comparatif : Vox vs Wispr Flow

| Fonctionnalité | **Vox** | **Wispr Flow** |
|---|---|---|
| **Modèle de Licence** | 100% Open-Source (MIT), Gratuit | Propriétaire / Commercial |
| **Tarification / Plan Gratuit** | Gratuit au quotidien (Groq/OpenAI/modèles locaux) | Limité à 2 000 mots/sem (Pro : 9$ à 29$+/mois) |
| **Déclenchement Vocal** | Mot clé "Vox" + raccourcis + commandes vocales | Dépend des raccourcis/cloud |
| **Fournisseurs d'IA** | Groq, OpenAI, Azure OpenAI, Ollama, LM Studio | Cloud propriétaire uniquement |
| **Confidentialité** | Appel direct aux API sans intermédiaire ; journal auditable | Traitement sur cloud propriétaire |
| **Systèmes Supportés** | Windows | Mac, Windows, iOS |
| **Arrêt Automatique (VAD)** | Oui, détection des silences et collage automatique | Oui |
| **Correction Contextuelle** | Oui (détecte éditeur de code, e-mail, document) | Non |
| **Modèles de Dictée** | Oui (e-mails, listes à puces, comptes rendus, commits…) | Non |
| **Commandes Vocales** | Oui (ponctuation, navigation, édition, système, etc.) | Non |
| **Vocabulaire Personnel** | Oui (termes personnalisés transmis au correcteur) | Non |
| **Historique Presse-Papier** | Oui (10 dernières dictées réinsérables avec F11) | Non |

#### Avantages

* **100% gratuit et open-source** — sans abonnement, code entièrement vérifiable.
* **Liberté de choix** — connectez Groq, OpenAI, Azure OpenAI ou exécutez vos modèles localement avec **Ollama** ou **LM Studio** pour une confidentialité totale.
* **Correction contextuelle** — Vox identifie l'application active et adapte le formatage ("éditeur de code" vs "e-mail").
* **Système de commandes vocales** — dictez ponctuation, navigation et actions ; créez vos commandes personnalisées.
* **Historique des habitudes** — après 25 sessions, Vox mémorise vos corrections récurrentes.
* **Vocabulaire personnalisé** — ajoutez vos acronymes et noms propres pour une transcription sans faille.
* **Journal de confidentialité** — chaque appel API (requête, endpoint, volume de données) est consigné localement.
* **Modèles structurés** — dictez directement des e-mails formatés, des listes de tâches, des notes de réunion et des commits.

---

## ◈ Raccourcis Globaux

| Raccourci | Mode | Comportement |
|---|---|---|
| `F9` | Push-to-Talk | Maintenir pour enregistrer, relâcher pour transcrire |
| `F10` | Bascule | Appuyer pour démarrer, réappuyer pour arrêter |
| `F11` | Historique | Ouvre les 10 dernières dictées pour réinsertion |

Tous les raccourcis sont **personnalisables** dans les Paramètres et restent actifs en arrière-plan.

---

## ◈ Installation & Démarrage

### Prérequis

- **Node.js** 20+
- **npm** 10+
- **Système d'exploitation** : Windows 10/11

### Développement

```bash
# Installer les dépendances
npm install

# Lancer en mode développement (hot-reload)
npm run dev
```

### Compilation pour Production

```bash
# Compiler le projet
npm run build

# Créer l'exécutable installable Windows
npx electron-builder --win
# Fichiers générés dans : dist-build/
```

---

## ◈ Licence

Projet distribué sous la **Licence MIT**. Consultez le fichier [LICENSE](LICENSE) pour plus d'informations.

---

<div align="center">

Cristóvão Carvalho &nbsp;·&nbsp; **Vox**

</div>
