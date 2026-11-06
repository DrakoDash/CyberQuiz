# 🛡️ CyberQuiz — Plateforme d'apprentissage en cybersécurité

CyberQuiz est une plateforme interactive de quiz et de sensibilisation à la cybersécurité, pensée pour aider les utilisateurs à comprendre les bases de la sécurité numérique, à reconnaître les principales menaces et à adopter de bonnes pratiques au quotidien.

## ✨ Ce que propose CyberQuiz

- Quiz thématiques sur la cybersécurité
- Modules progressifs pour débutants et utilisateurs intermédiaires
- Explications simples et pédagogiques
- Suivi de progression et parcours d'apprentissage
- Interface moderne et immersive inspirée du monde cyber
- Accès rapide depuis un navigateur, avec une expérience pensée pour l’usage web moderne

## 🎯 Objectifs du projet

CyberQuiz a pour mission de :

- rendre la cybersécurité accessible à tous
- transformer l’apprentissage en expérience interactive
- sensibiliser aux risques numériques courants
- encourager les bonnes pratiques de sécurité
- offrir un outil simple, visuellement engageant et facile à utiliser

## 🧩 Thèmes abordés

Le projet couvre plusieurs axes importants :

- initiation à la cybersécurité
- sécurité des mots de passe
- menaces et attaques courantes
- sécurité des réseaux et Wi‑Fi
- bonnes pratiques de sécurité informatique
- réponse aux incidents
- mises en situation interactives (messagerie, fichiers, partage, mots de passe)
- quiz de synthèse et progression

## 🛠️ Stack technique

Le site est principalement construit en :

- HTML
- CSS
- JavaScript

La structure actuelle privilégie une approche légère, rapide et compatible avec un usage web moderne, avec un style visuel inspiré d’une interface cyber / terminal / sécurité numérique.

## 📲 Installer l'application

CyberQuiz est une web app (PWA) : ouvre le site dans Edge ou Chrome puis clique sur **Installer l'app**.
Sur iPhone : Safari → Partager → « Sur l'écran d'accueil ». L'application fonctionne hors-ligne.
Pour voir le mode application sans l'installer : ajoute `?mode=app` à l'adresse d'une page.

## 🛠️ Mettre le site en maintenance

Tout se règle dans **`maintenance.json`**, modifiable directement sur GitHub (icône crayon ✏️ puis « Commit changes ») :

| `"mode"` | Effet |
|---|---|
| `"off"` | Site normal |
| `"annonce"` | Bandeau d'information, le site reste utilisable (ex. maintenance prévue ce soir) |
| `"maintenance"` | Écran de maintenance : le site et l'application installée sont bloqués |

- `"titre"` et `"message"` : les textes affichés.
- `"debut"` (annonce) et `"fin"` (maintenance) : dates au format `"2026-10-20T18:00:00+01:00"`, ou `""`.
  ⚠ Le décalage horaire change avec l'heure d'été : `+01:00` en hiver, `+02:00` en été.
- `"pages"` (annonce, facultatif) : limiter le bandeau à certaines pages, ex. `["accueil.html"]`.
- `"icone"` (annonce, facultatif) : l'émoji du bandeau (🛠️ par défaut).

Exemple pour l'ancien bandeau « site en développement », affiché seulement sur l'accueil :

```json
{
  "mode": "annonce",
  "titre": "Avis important",
  "message": "Le site est actuellement en développement.",
  "icone": "⚠️",
  "pages": ["accueil.html"],
  "debut": "",
  "fin": "",
  "cle_dev_sha256": "…"
}
```
- Le changement est visible une à deux minutes après le commit (temps de publication de GitHub Pages).
  Les visiteurs bloqués sont libérés automatiquement dès le retour à `"off"` (vérification toutes les 30 s).
- **Accès développeur** pendant la maintenance : ouvrir une page avec `?dev=LA_CLÉ`. Pour changer la clé :
  console du navigateur (F12) → `CyberMaintenance.hash('nouvelle-clé')` → coller le résultat dans `"cle_dev_sha256"`.
- ⚠ Le blocage se fait dans le navigateur : il sert à informer, ce n'est pas une protection de sécurité.

**Conseil :** déposer tous les fichiers d'une mise à jour **en un seul commit**, puis repasser en `"off"`.

## 🚀 Accès au site

Le site est accessible ici :

- https://drakodash.github.io/CyberQuiz/

## 📁 Structure du dépôt

```text
CyberQuiz/
├── index.html              # écran d'introduction
├── accueil.html            # accueil (Continuer, Ma progression, À la une)
├── quiz.html               # liste des quiz
├── situations.html         # liste des mises en situation
├── changelog.html          # notes de version (contenu : changelog.json)
├── parametres.html         # thème, taille du texte, son, transfert de progression
├── about.html              # à propos et confidentialité
├── succes.html             # salle des trophées
├── 404.html / offline.html # page introuvable / hors-ligne
│
├── debutant.html, mdp.html…  # pages de quiz : coquilles vides (data-quiz="…")
├── questions/              # ⭐ LE CONTENU DES QUIZ (un fichier .json par quiz)
│   ├── LISEZMOI.md         #    mode d'emploi : corriger / ajouter un quiz
│   ├── _modele.json        #    modèle de quiz
│   └── _modele-page.html   #    modèle de page de quiz
├── quiz-engine.js / .css   # moteur commun de tous les quiz
├── simulation.html         # module interactif « Premier jour au bureau »
│
├── changelog.json          # ⭐ LES NOTES DE VERSION (voir plus bas)
├── maintenance.json        # ⭐ interrupteur du mode maintenance (voir plus haut)
│
├── site.css / site.js      # styles et script des pages « site »
├── theme-light.css         # thème clair
├── app.js / app.css        # préférences d'affichage + style « application » installée
├── audio.js                # musique et effets sonores (Web Audio)
├── succes.js               # système de succès
├── whatsnew.js             # fenêtre « Quoi de neuf ? » + point rouge du menu
├── progression.js          # sauvegarde / transfert (fichier, QR code)
├── changelog.js, parametres.js
├── maintenance.js, pwa.js, service-worker.js, manifest.json
└── assets/
    ├── fonts/              # Poppins et Share Tech Mono (licence OFL)
    ├── fa/                 # icônes Font Awesome utilisées (sous-ensemble)
    ├── lib/qrcode.js       # générateur de QR codes (licence MIT)
    ├── changelog/          # captures des notes de version
    ├── icons/              # icônes de l'application
    └── og-image.jpg        # image d'aperçu quand on partage le lien
```

## 📋 Ajouter une note de version

Tout se passe dans **`changelog.json`** (sur GitHub : icône crayon ✏️). La page des versions, la fenêtre « Quoi de neuf ? » et le point rouge du menu se mettent à jour tout seuls.

1. Copie le bloc `"_modele"` qui est en haut du fichier.
2. Colle-le **en premier** dans la liste `"versions"` (juste après `"versions": [`) et ajoute une virgule après le `}` de fin.
3. Remplis-le :

```json
{
  "version": "Beta 28.1",
  "date": "2026-12-01",
  "titre": "Titre court",
  "resume": "Une ou deux phrases (affichées dans la fenêtre « Quoi de neuf ? »).",
  "essayer": { "texte": "Essayer", "lien": "quiz.html" },
  "image": "assets/changelog/beta-28-1.jpg",
  "changements": [
    { "type": "nouveau", "texte": "Une nouvelle fonctionnalité" },
    { "type": "amelioration", "texte": "Quelque chose qui marche mieux" },
    { "type": "correction", "texte": "Un bug corrigé" },
    { "type": "securite", "texte": "Un point de sécurité ou de confidentialité" }
  ]
}
```

- `date` au format **AAAA-MM-JJ** (les versions sont triées automatiquement par date).
- `type` : `nouveau`, `amelioration`, `correction` ou `securite` (sans accent).
- `essayer` et `image` sont facultatifs : supprime-les si inutiles.
- L'onglet **« À venir »** se remplit avec la liste `"a_venir"` (statut `en-cours`, `prevu` ou `idee`).
- Pense aussi à augmenter `CACHE_VERSION` dans `service-worker.js` pour que l'application installée se mette à jour.

## ✏️ Modifier les questions d'un quiz

Les questions sont dans `questions/<quiz>.json`. Mode d'emploi détaillé (et création d'un nouveau quiz) : [`questions/LISEZMOI.md`](questions/LISEZMOI.md).

## 🧠 Idée générale du projet

CyberQuiz est conçu comme une plateforme d’apprentissage ludique qui combine :

- un univers visuel cyber / futuriste
- des contenus éducatifs utiles
- des quiz pratiques pour évaluer la compréhension
- un parcours qui encourage la curiosité et la progression

## 👥 À propos du projet

La page dédiée est disponible ici :

- [about.html](about.html)

## 🤝 Contribution

Les contributions sont bienvenues. Vous pouvez :

- proposer des améliorations de contenus
- ajouter des quiz ou thématiques
- corriger des erreurs ou améliorer l’expérience utilisateur
- perfectionner le design visuel
- proposer des idées d’apprentissage ou de parcours

## 📌 Remarques

Ce projet est pensé comme une base évolutive pour un site éducatif en cybersécurité, avec un accent sur la clarté, l’interactivité et le style visuel immersif.

---

Fait avec ❤️ pour apprendre la cybersécurité et la partager plus simplement.
