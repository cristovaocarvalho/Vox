<div align="center">

<img src="src/assets/logo.png" alt="Vox Logo" width="160" />

# Vox

### La Couche Opérationnelle Souveraine de Dictée Vocale pour Bureau

*Un système de dictée vocale et d'automatisation des flux de travail sans compromis, privé et à la pointe de la technologie, conçu pour Windows et macOS.*

<br />

[English](README.md) &nbsp;·&nbsp; [Português](README.pt.md) &nbsp;·&nbsp; [Español](README.es.md) &nbsp;·&nbsp; [Français](README.fr.md) &nbsp;·&nbsp; [Deutsch](README.de.md) &nbsp;·&nbsp; [Italiano](README.it.md) &nbsp;·&nbsp; [日本語](README.ja.md) &nbsp;·&nbsp; [简体中文](README.zh-CN.md)

<br />

</div>

---

<div align="center">
  <img src="src/assets/Vox - UI.png" alt="Interface de Vox" width="840" />
</div>

<br />

## L'Alternative Souveraine aux Abonnements

Les logiciels commerciaux de dictée vocale enferment les professionnels dans des abonnements mensuels récurrents, imposent des quotas arbitraires de mots et acheminent des pensées privées ainsi que du code source confidentiel via des serveurs tiers.

**Vox incarne un nouveau standard d'ingénierie.** Conçu avec une esthétique minimaliste et luxueuse en glassmorphism et propulsé par un cœur natif ultra-performant, Vox convertit la voix en texte précis avec Whisper, perfectionne la ponctuation et la cohésion sémantique grâce au modèle de langage de votre choix, et injecte le résultat directement à l'emplacement de votre curseur actif dans n'importe quelle application — sans abonnement, sans télémétrie et dans une confidentialité totale.

<br />

---

## Suite Complète de Fonctionnalités

### Exécution Native Multiplateforme
Développé nativement pour **Windows 10/11 (64-bit)** et **macOS (Apple Silicon M1/M2/M3/M4 et Intel)**. Vox s'intègre profondément au système d'exploitation, respectant l'accessibilité native, la détection des fenêtres de premier plan et les raccourcis globaux.

### Gestionnaire Whisper Local Intégré (100% Hors Ligne)
Téléchargez, configurez et exécutez les modèles Whisper GGML (Tiny, Base, Small, Medium, Large v3, Distil-Whisper) directement depuis l'interface de Vox en 1 clic. Aucun script Python externe ni terminal requis. Fonctionnez entièrement hors ligne avec une latence nulle et une isolation cryptographique absolue.

### Apportez Vos Propres Clés (BYOK) et Liberté Totale de Modèles
Vous avez un contrôle absolu sur les modèles utilisés dans vos flux de travail. Connectez-vous directement aux meilleurs moteurs d'inférence IA ou utilisez des serveurs locaux :
* **Fournisseurs Cloud :** Groq, OpenAI, Azure OpenAI, Deepgram, Cerebras, Mistral, Together AI.
* **Environnements Locaux :** Ollama, LM Studio, vLLM, LocalAI.
* **Liberté Totale :** Choisissez librement le modèle vocal (STT) et le grand modèle de langage (LLM) parmi ceux de votre fournisseur ou de votre serveur local.

### Raffinement Sémantique et Correction Intelligente
La reconnaissance vocale brute produit souvent des phrases sans ponctuation ou avec des homophones. Vox associe la dictée à des correcteurs LLM intelligents — alimentés par le modèle de votre choix — pour insérer une ponctuation soignée, formater les majuscules et préserver la fluidité naturelle du discours.

### Commandes Vocales et Lancement Instantané d'Applications
Exécutez des automatisations complètes du système d'exploitation sans toucher au clavier. Vox comprend vos commandes vocales pour ouvrir n'importe quel logiciel installé sur votre ordinateur :
* **Lancement d'Applications :** *"Ouvrir VS Code"*, *"Ouvrir Chrome"*, *"Ouvrir Slack"*, *"Ouvrir Terminal"*, *"Ouvrir Bloc-notes"*, *"Ouvrir Calculatrice"*, ou tout logiciel par son nom.
* **Recherche Web :** *"Ouvrir Chrome et rechercher documentation React"*, *"Rechercher sur YouTube musique relaxante"*, *"Rechercher physique quantique"*.
* **Navigation et Édition :** *"Nouvelle ligne"*, *"Nouveau paragraphe"*, *"Effacer dernière phrase"*, *"Effacer mot"*, *"Tout sélectionner"*, *"Annuler"*, *"Copier"*, *"Coller"*.
* **Contrôles Vox :** *"Mode Code"*, *"Mode Texte"*, *"Mode Email"*, *"Dictée libre"*, *"Répéter dernière dictée"*, *"Annuler"*.

### Adaptation Contextuelle à l'Application Active
Vox analyse la fenêtre active avant la transcription. Lorsque vous écrivez du code dans VS Code ou le Terminal, Vox formate proprement les identifiants et la syntaxe. Lors de la rédaction d'un e-mail ou d'un document, il génère des paragraphes naturels.

### Snippets et Textes Automatiques Vocaux
Configurez des blocs de texte fréquents associés à des déclencheurs vocaux. Prononcer *"Ma signature"*, *"Insérer email"*, *"Mon adresse"* ou vos expressions personnalisées insère instantanément des textes multi-lignes pré-formatés.

### Modèles de Dictée Personnalisés (Templates)
Créez des modèles avec des directives de mise en page et des déclencheurs vocaux dédiés. Basculez entre comptes-rendus de réunion, rapports techniques, résumés à puces et dictée libre simplement en prononçant le nom du modèle.

### Activation Mains Libres (*"Vox"*)
Propulsé par des modèles neuronaux locaux ONNX OpenWakeWord. Dites simplement *"Vox"* pour réveiller le système et débuter la dictée sans toucher au clavier.

### Détection d'Activité Vocale (VAD) et Protection Audio
L'algorithme VAD intégré détecte la fin naturelle de votre prise de parole et clôture la dictée automatiquement. Pendant que vous parlez, Vox peut couper le son du système pour éliminer l'écho, le rétablissant instantanément à la fin.

### Vocabulaire Technique Personnalisé
Ajoutez des noms propres, du jargon d'entreprise et des sigles à votre dictionnaire personnel. Vox garantit une orthographe rigoureuse et cohérente à chaque dictée.

### Tableau de Bord de Productivité et Heatmap d'Activité
Suivez votre gain de vitesse de frappe, le nombre total de mots dictés, les heures économisées et visualisez votre constance quotidienne grâce à une carte thermique style GitHub.

### Coffre-Fort de Confidentialité et Journaux Transparents
Toutes les configurations, snippets, modèles et historiques sont conservés exclusivement dans une base de données SQLite locale sur votre disque. Inspectez chaque requête API dans les journaux de confidentialité transparents.

<br />

---

## Comparatif Architectural

| Dimension | Vox | Solutions Commerciales SaaS |
|:---|:---|:---|
| **Licence** | Open Source (MIT) | Propriétaire Fermée |
| **Coût** | Gratuit à Vie (BYOK / Local) | 180 € – 360 € / an récurrent |
| **Confidentialité** | 100% Local ou Direct vers l'API | Données transitant par des serveurs tiers |
| **Modèles Hors Ligne** | Téléchargement In-App en 1 Clic (Whisper) | Souvent indisponibles ou payants |
| **Choix des Modèles** | Liberté Totale (Tout LLM/STT Cloud ou Local) | Modèles fermés et imposés |
| **Commandes Vocales & Apps** | Ouvre Toute Application, Recherche & Contrôle | Ponctuation basique uniquement |
| **Compatibilité** | Windows 10/11 & macOS (Universel) | Limité à un seul système |
| **Vocabulaire Sur Mesure** | Illimité dans SQLite Local | Restreint |
| **Limites d'Utilisation** | Illimité | Plafonds de mots contraignants |

<br />

---

## Raccourcis par Défaut

| Raccourci (Win / Mac) | Mode | Description |
|:---|:---|:---|
| `F10` / `Control+Space` | **Basculer Dictée** | Appuyez pour démarrer ; faites une pause ou réappuyez pour insérer le texte |
| `F9` / `Option+Space` | **Push-to-Talk** | Maintenez enfoncé pendant que vous parlez ; relâchez pour insérer |
| `F11` / `Command+Shift+V` | **Historique Presse-Papiers** | Ouvre la fenêtre flottante pour revoir et réinsérer les dictées passées |
| *"Vox"* | **Mot de Réveil** | Activation vocale en arrière-plan sans contact avec le clavier |

<br />

---

## Démarrage Rapide

### Prérequis
* **Windows :** Windows 10 ou 11 (64-bit)
* **macOS :** macOS 12 Monterey ou ultérieur (Apple Silicon M1/M2/M3/M4 ou Intel x64)
* **Node.js :** Node.js 20+ et npm

### Développement Local

```bash
# Cloner le dépôt
git clone https://github.com/cristovaocarvalho/Vox.git
cd Vox/code

# Installer les dépendances
npm install

# Démarrer l'environnement de développement
npm run dev
```

### Compilation et Paquetage

```bash
# Vérification des types et compilation
npm run build

# Créer l'installateur Windows (.exe)
npm run build:win

# Créer le paquet macOS (.dmg et .zip)
npm run build:mac

# Créer le paquet macOS Apple Silicon
npm run build:mac:arm64
```

<br />

---

## Licence

Distribué sous licence **MIT**. Conçu par [Cristovão Carvalho](https://github.com/cristovaocarvalho) et la communauté open-source.
