# ⚽ Football Challenge 2026 — World Cup Edition

Application de suivi du challenge forfaits, thème Coupe du Monde 2026.

---

## 🚀 Lancement rapide

```bash
npm install
npm run dev
```

## 🔥 Configuration Firebase (persistance cloud)

### 1. Créer le fichier `.env`
```bash
cp .env.example .env
```

### 2. Remplir vos credentials Firebase
Dans la **Console Firebase** → Project Settings → General → Your apps → SDK setup and configuration

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre-projet
VITE_FIREBASE_STORAGE_BUCKET=votre-projet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### 3. Configurer Firestore
1. Dans la Console Firebase → Firestore Database → Créer une base de données
2. Mode **Production** (ou Test pour commencer)
3. Règles de sécurité (onglet Règles) :
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /challenge/state {
      allow read, write: if true;
    }
  }
}
```

### 4. Déployer sur GitHub Pages
```bash
npm run build
# Puis pousser le dossier dist/ sur GitHub
# Ou utiliser GitHub Actions
```

**Note** : Pour GitHub Pages, ajouter les secrets dans Settings → Secrets and variables → Actions.

---

## 🔐 Accès Manager
Mot de passe : **Raphael2232**

---

## 💰 Système de primes (configurable dans le Dashboard)

| Palier | Taux défaut | Condition |
|--------|-------------|-----------|
| Base | 9,99€/forfait | Tous, 0→40 |
| Palier 2 | 12€/forfait | Dès 40 forfaits cumulés |
| Palier 3 | 15€/forfait | Dès 50 + individuel ≥ 3 |
| Top Buteur | 20€/forfait | Déclenché manuellement en fin de phase |

⚠️ Le bonus **Top Buteur 20€** ne se déclenche **jamais automatiquement** — il faut l'activer dans le Dashboard → "Phase de préparation terminée".

---

## 🎮 Fonctionnalités

- ⚽ Terrain SVG interactif avec avatars glissables (drag & drop)
- 🗳️ Vote par ballons (gris → colorés) pour enregistrer les forfaits
- 👑 Couronne automatique au hat-trick (≥3 forfaits)
- 📊 Barre de progression paliers en temps réel
- 🏆 Classement avec calcul des primes
- 📋 Règles visuelles et motivantes
- 🔧 Dashboard manager avec :
  - Gestion joueurs (ajout, renommage, couleur, suppression)
  - Modification manuelle des scores
  - **Paramètres des taux de prime (tous modifiables)**
  - **Toggle fin de phase → active le bonus top buteur**
  - Reset scores / positions
- 🔥 Sync Firebase temps réel (multi-appareils)
- 💾 Fallback localStorage si Firebase non configuré
- 📱 Responsive mobile + desktop
