# Les questions des quiz

Chaque quiz de CyberQuiz = **un fichier JSON** dans ce dossier (`mdp.json`, `wifi.json`…).
La page HTML du quiz (`mdp.html`…) est une coquille vide : c'est `quiz-engine.js` qui lit le JSON et construit la page.

## ✏️ Corriger ou ajouter une question

Ouvre le fichier du quiz (sur GitHub : icône crayon ✏️) et modifie la liste `"questions"` :

```json
{
  "q": "Le texte de la question ?",
  "a": ["Réponse A", "Réponse B", "Réponse C"],
  "c": 1,
  "e": "L'explication affichée dans la correction.",
  "scenario": "Mise en contexte (facultatif, à supprimer si inutile)"
}
```

- `c` = numéro de la **bonne réponse en commençant à 0** : 0 = A, 1 = B, 2 = C…
- Entre deux questions, il faut une **virgule** `},` — mais **pas** après la dernière.
- Les guillemets à l'intérieur d'un texte s'écrivent `\"` (ou utilise les guillemets français « »).
- Si le fichier contient une erreur, la page du quiz affiche un message qui indique où chercher.

⚠️ Modifier les questions d'un quiz remet à zéro les **parties en cours** de ce quiz (pas les scores ni les succès).

## ➕ Créer un nouveau quiz

1. Copie `_modele.json` → `mon-quiz.json` (le nom du fichier = l'identifiant, en minuscules, sans espace ni accent).
2. Remplis-le : `"id"` doit être **identique** au nom du fichier.
3. Copie `_modele-page.html` à la racine du site → `mon-quiz.html`, puis remplace `MON-QUIZ` par `mon-quiz` (2 endroits) et le titre.
4. Ajoute le quiz à la liste dans 3 fichiers :
   - `site.js` (liste `ALL_QUIZZES`) → progression de l'accueil ;
   - `succes.js` (liste `QUIZZES`) → succès ;
   - `service-worker.js` (liste `APP_SHELL`) → `mon-quiz.html` et `questions/mon-quiz.json`, pour le hors-ligne.
5. Ajoute sa carte dans `quiz.html` (ou `situations.html`) : copie une carte existante et change le lien, le titre, le texte et `id="status-mon-quiz"`.
6. Ajoute une note de version dans `changelog.json` 😉

## Les champs du fichier

| Champ | Rôle |
|---|---|
| `titre`, `titre_onglet` | Titre affiché dans la page / dans l'onglet du navigateur |
| `categorie` | `"quiz"` ou `"situations"` (où ramène le bouton ← retour) |
| `niveau`, `module`, `parcours` | Petites étiquettes de l'en-tête |
| `description`, `themes` | Phrase d'introduction et 3 mots-clés |
| `couleur` | Couleur principale en `"R, V, B"` (ex. `"255, 209, 112"`) |
| `couleur2` | Couleur secondaire en hexadécimal (ex. `"#ff9b71"`) |
| `mode` | `"entrainement"` (correction à la fin) ou `"validation"` (on valide chaque question, ordre mélangé) |
| `consigne`, `pied_de_page` | Petits textes en haut et en bas |
| `illustration` | Dessin SVG du grand rond (facultatif) |
