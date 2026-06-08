# ⚽ Football Challenge 2026

Application de gestion du challenge forfaits sur le thème de la Coupe du Monde 2026.

## 🚀 Installation

```bash
npm install
npm run dev
```

## 📦 Build (pour déploiement)

```bash
npm run build
```
Les fichiers de production seront dans le dossier `dist/`.

## 🌐 Déploiement GitHub Pages

1. Pusher le code sur GitHub
2. Activer GitHub Pages sur la branche `main` → dossier `/dist`
3. Ou utiliser GitHub Actions avec la config Vite

## 🔐 Accès Manager

Mot de passe : **Raphael2232**

## 📋 Fonctionnalités

- ⚽ **Terrain interactif** : avatars glissables sur le terrain de foot
- 🗳️ **Vote par ballons** : cliquer les ballons pour enregistrer les forfaits
- 👑 **Hat-Trick** : couronne automatique à 3+ forfaits
- 🏆 **Classement** : top buteurs avec calcul des primes en temps réel
- 📋 **Règles** : page visuelle et motivante
- 🔧 **Dashboard** : gestion complète des joueurs et scores (protégé)

## 💰 Système de primes

| Palier | Taux | Condition |
|--------|------|-----------|
| 0-40 forfaits | 10€/forfait | Tous |
| 41-50 forfaits | 12€/forfait | Tous |
| 51+ forfaits | 15€/forfait | Si individuel ≥ 3 |
| Top buteur | 20€/forfait | Meilleur buteur unique |

## 🛠️ Tech

- React 18 + Vite
- CSS custom (pas de framework UI)
- localStorage pour la persistance des données
- Responsive mobile + desktop
