<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="160" />

# Vox

### Dictée Vocale IA de Haute Précision — Directement sous Votre Curseur Actif

*Un système de dictée vocale ouvert, privé et conçu pour Windows.*

<br />

[Français](README.fr.md) &nbsp;·&nbsp; [English](README.md) &nbsp;·&nbsp; [Português](README.pt.md) &nbsp;·&nbsp; [Español](README.es.md) &nbsp;·&nbsp; [Deutsch](README.de.md) &nbsp;·&nbsp; [简体中文](README.zh-CN.md) &nbsp;·&nbsp; [日本語](README.ja.md) &nbsp;·&nbsp; [Italiano](README.it.md)

<br />

</div>

---

<div align="center">
  <img src="src/assets/Vox - UI.png" alt="Interface de Vox" width="820" />
</div>

<br />

## Pourquoi Vox

Les solutions commerciales de dictée vocale imposent des abonnements mensuels, restreignent les volumes de mots et transitent vos enregistrements sur des serveurs tiers pour entraîner leurs propres modèles.

**Vox adopte une architecture autonome.** Il offre une expérience de dictée intégrée au système d'exploitation, transmettant l'audio à Whisper, affinant la ponctuation par des modèles de langage et injectant le texte mis en forme directement sous le curseur actif de toute application Windows.

<br />

## Principes Fondamentaux

### Autonomie Architecturale Totale (BYOK)
Connectez-vous directement aux fournisseurs d'inférence de pointe — tels que Groq, OpenAI ou Azure OpenAI — via vos propres clés d'API, ou exécutez le traitement de manière 100% locale et hors-ligne grâce à **Ollama** et **LM Studio**. Aucun intermédiaire, aucune télémétrie, aucune rétention de données.

### Précision Multilingue Native
Conçu pour reconnaître et structurer la dictée dans **8 langues principales** — Français, Anglais, Portugais, Espagnol, Allemand, Chinois, Japonais et Italien — en respectant la cadence naturelle du discours sans traduction forcée.

### Correction Sémantique Contextuelle
Vox prend en compte l'application en cours d'utilisation. Que vous rédigiez du code dans un IDE, un e-mail professionnel ou des notes rapides, le correcteur adapte la syntaxe, la casse et la ponctuation au contexte.

### Injection Instantanée au Curseur
Déclenchez la dictée via des raccourcis globaux (`F10` / `F9`) ou par commande vocale (*"Vox"*). La détection intelligente des silences (VAD) insère le texte formaté à l'endroit précis où se trouve votre curseur.

### Libre et Open Source
Distribué sous licence MIT. Sans abonnement, sans restrictions artificielles de volume ni frais cachés.

<br />

---

## Comparatif

| Dimension | Vox | Solutions Commerciales |
|:---|:---|:---|
| **Licence** | Open Source (MIT) | Propriétaire / Commerciale |
| **Tarification** | Gratuit et Libre | 180 $ à 360 $ par an |
| **Flux de Données** | Direct au Fournisseur ou 100% Local | Intermédié sur serveurs tiers |
| **Inférence Hors-ligne** | Prise en charge (Ollama / LM Studio) | Non disponible |
| **Limite de Mots** | Illimitée | Quotas imposés |
| **Modèles Vocaux** | Famille Whisper complète + Tout LLM | Modèles propriétaires fermés |
| **Insertion au Curseur** | Injection Native Win32 | Variable |

<br />

---

## Raccourcis Globaux

| Raccourci | Mode | Action |
|:---|:---|:---|
| `F10` | **Bascule** | Appuyez pour commencer ; appuyez à nouveau ou faites silence pour insérer |
| `F9` | **Push-to-Talk** | Maintenez enfoncé pendant le discours ; relâchez pour insérer |
| `F11` | **Historique** | Accédez aux dernières dictées pour réinsertion rapide |
| *"Vox"* | **Mot Clé** | Activation vocale mains libres |

<br />

---

## Installation et Démarrage

### Prérequis
* Windows 10 ou 11 (64-bit)
* [Node.js](https://nodejs.org) (v20+) et npm

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/votre-nom/vox.git
cd vox/code

# Installer les dépendances
npm install

# Lancer l'environnement de développement
npm run dev
```

### Compilation pour Production

```bash
npm run build:win
```

<br />

---

## Licence

Distribué sous la **Licence MIT**. Consultez le fichier [LICENSE](LICENSE) pour plus d'informations.

<div align="center">
<br />

Cristóvão Carvalho &nbsp;·&nbsp; **Vox**

</div>
