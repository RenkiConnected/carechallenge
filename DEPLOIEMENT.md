# 🚀 Déployer sur Vercel — guide simple

Ton appli est déjà en ligne (carechallenge.vercel.app) et liée à un dépôt GitHub
(`RenkiConnected/carechallenge`). Tu n'as donc qu'à **remplacer les fichiers par
cette version corrigée**. Vercel redéploie tout seul, automatiquement.

Plus besoin de configurer la moindre variable Firebase : les clés sont intégrées,
ça marche dès le déploiement.

---

## ✅ Méthode 1 — Par GitHub (recommandée, zéro logiciel à installer)

1. Décompresse le fichier `football-challenge-2026-fixed.zip` sur ton ordinateur.
2. Va sur **https://github.com/RenkiConnected/carechallenge**
3. Clique sur le dossier `src`, puis sur le fichier `App.jsx` →
   bouton crayon ✏️ (Edit) en haut à droite.
4. Sélectionne tout (Ctrl+A), supprime, puis colle le contenu du **nouveau**
   `src/App.jsx` (ouvre-le avec le Bloc-notes). Clique **Commit changes** (bouton vert).
5. Refais la même chose pour `src/firebase.js`.
6. C'est tout : Vercel détecte le changement et redéploie en ~1 minute.
   Va sur l'onglet **Deployments** de ton projet Vercel pour voir la progression.

> Seuls **2 fichiers ont changé** dans cette version : `src/App.jsx` et
> `src/firebase.js`. Tu peux ne remplacer que ces deux-là.

---

## ✅ Méthode 2 — Glisser-déposer tout le dossier sur GitHub

1. Sur **https://github.com/RenkiConnected/carechallenge**, clique
   **Add file → Upload files**.
2. Fais glisser TOUT le contenu du dossier décompressé (le dossier `src`, `public`,
   `index.html`, `package.json`, etc.).
3. Clique **Commit changes**. Vercel redéploie automatiquement.

---

## ✅ Méthode 3 — Ligne de commande (si tu as Node installé)

Dans le dossier décompressé, ouvre un terminal et tape :

```bash
npx vercel --prod
```

Connecte-toi quand c'est demandé, accepte les réglages par défaut. L'URL de ton
site s'affiche à la fin.

---

## 🔒 Une seule chose à vérifier côté Firebase

Pour que la synchronisation entre appareils marche, les **règles Firestore**
doivent autoriser la lecture/écriture. Dans la console Firebase
(console.firebase.google.com → projet `carechallenge-24abd` → Firestore → Règles) :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /challenge/{doc} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ `if true` = tout le monde peut lire/écrire. C'est simple et suffisant pour un
> usage interne. Pour plus de sécurité plus tard, on pourra restreindre.

Si les règles bloquent, l'appli affiche « Firebase non connecté » et continue en
mode local (tout marche, mais sans partage entre appareils).
