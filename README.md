# 🍅 Playlist-Pomodoro Intelligence

> Application web tout-en-un qui combine **gestion de tâches Pomodoro**, **ambiance intelligente** (musique, éclairage, thème) et **collaboration en temps réel** pour aider les gens à rester concentrés et sereins dans leur espace de travail.

**Dépôt** : `Clarco-Mada-digital/pomodoro` — branche `main`
**Tâche d'initialisation** : `PF-356` (premier commit du dépôt)

---

## 🎯 Objectif du produit

Réduire la fatigue visuelle et mentale, améliorer la concentration et favoriser la productivité grâce à une interface intuitive : un minuteur Pomodoro, une ambiance sonore et lumineuse qui s'adaptent à la session, et un suivi de productivité motivant.

## 🌟 Concept

- **Tâches à minuter** (Pomodoro) + **changement d'ambiance intelligent** (éclairage, musique, thème, espace de travail)
- **Collaboration de groupe** et **comparaison de productivité en temps réel**
- **Intégrations** : Google Calendar, Notion, IDEs, projets GitHub

## ✨ Fonctionnalités

| UI / Contenu | Fonctionnalité | Pourquoi c'est cool et utile |
|--------------|---------------|---------------------------|
| **Dashboard Pomodoro** | Minuteurs de session de 25 minutes, vue réinitialisée, statistiques visuelles | Améliore la concentration, réduit la fatigue |
| **Contrôle d'ambiance** | LED RVB contrôlables via le navigateur, switching de thème de nuit, fond d'écran du jour | Réduit la fatigue oculaire, s'aligne avec le rythme circadien |
| **Définition de projet intelligente** | Bibliothèque musicale liée au timer, ambiances (neutre, jazz, lo-fi, classique) | Favorise la concentration, déstresse, personnalisable |
| **Compteur de productivité** | Comptage et suivi en temps réel des pomodoros, objectifs horaires | Encourage et récompense les habitudes |
| **Collaboration en équipe** | Liste de tâches partagée, statut visuel (en ligne/hors ligne), badge d'équipe | Idéal pour le travail à distance |
| **Intégration Notion / Google Calendar** | Export des tâches du calendrier, import des notes Notion | Zéro duplication de saisie de données |
| **Badges et guildes** | Récompenses : « 8 jours d'affilée », « 8h de session », « Champion d'équipe » | Gamification de l'habitude |

## 🛠️ Stack technique validée

Décisions tranchées en documentation d'équipe (la documentation fait foi en cas de contradiction avec la description initiale du projet).

| Couche | Choix validé | Justification |
|--------|--------------|---------------|
| **Frontend** | **React (TypeScript)** + **Tailwind CSS** | Interface réactive, gestion des thèmes rapide, typage robuste |
| **Backend** | **Node.js + Express** | API simple et optimisée, écosystème mature |
| **Base de données** | **PostgreSQL** | Robuste, durable, prêt pour la collaboration multi-utilisateurs |
| **Temps réel** | **Socket.IO** | Collaboration et comparaison de productivité en direct |
| **Solution audio** | **Web Audio API** | Contrôle fin du mix (fades, playlists d'ambiance), pas de dépendance à un lecteur HTML5 bloquant |
| **Solution domotique (LED RVB)** | **API/bridge local avec simulation côté navigateur** | Fonctionne sans matériel (mode simulation), branchable sur un bridge LED réel plus tard |
| **Intégrations externes** | CORS intégré, OAuth Google / Notion (portée minimale) | Zéro duplication de saisie de données |

> ⚠️ La description initiale mentionnait *Vue 3 + SQLite + Prisma* : **ces choix ont été remplacés** par React (TypeScript) et PostgreSQL, conformément à la documentation de l'équipe.

## 📁 Structure du dépôt

```
pomodoro/
├── README.md                 # Ce fichier
├── package.json              # Workspace racine (scripts dev/test)
├── .gitignore
├── client/                   # Frontend React + TypeScript + Tailwind
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       └── components/PomodoroTimer.tsx
├── server/                   # Backend Node.js + Express + PostgreSQL
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── db.js
│       └── routes/pomodoros.js
└── tests/                    # Tests sans dépendance externe (node:test)
    └── pf-356-repo-init.test.mjs
```

## 🚀 Démarrage

> Les commandes d'installation nécessitent un accès réseau ; elles ne sont pas exécutées par le connecteur de déploiement.

```bash
# 1. Dépendances (workspaces npm)
npm install

# 2. Base de données
createdb pomodoro

# 3. Backend (API : http://localhost:4000)
npm run dev:server

# 4. Frontend (UI : http://localhost:5173)
npm run dev:client
```

### Variables d'environnement attendues par le backend

| Variable | Description | Exemple |
|----------|-------------|---------|
| `PORT` | Port de l'API Express | `4000` |
| `DATABASE_URL` | Chaîne de connexion PostgreSQL | `postgresql://localhost:5432/pomodoro` |

_(Aucun fichier `.gitignore` ne doit contenir d'erreur ici : les fichiers `.env` sont **exclus du dépôt** ; seul l'environnement réel en fournit les valeurs.)_

## 🧪 Tests

```bash
npm test
```

Les tests s'appuient sur `node:test` (Node.js ≥ 18) et ne nécessitent aucune installation.

- `tests/pf-356-repo-init.test.mjs` — vérifie l'initialisation du dépôt (PF-356) : dépôt Git sur la branche `main`, `README.md` versionné, premier commit `PF-356` présent.

## ✅ Tâche PF-356 — Initialisation du dépôt

| Étape | Description | Statut |
|-------|-------------|--------|
| 1 | Initialiser le dépôt localement (`git init`, branche `main`) | ✅ |
| 2 | Créer le fichier `README.md` | ✅ |
| 3 | Ajouter le fichier `README.md` | ✅ |
| 4 | Faire le premier commit (message préfixé `PF-356`) | ✅ |
| 5 | Pousser le commit sur `main` du dépôt distant | ⏳ réalisé par le connecteur |

---

_Créée par Théo (IA) à la demande de Bryan Clark — Tâche PF-356._
