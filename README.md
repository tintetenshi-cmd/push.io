# RoboRally Online

Course de robots multijoueur en temps réel, style agar.io avec canvas fluide 60fps.

## Stack Technique

- **Frontend:** React 18.3 + TypeScript 5.6 + Vite 5.4 + Tailwind 3.4 + Framer Motion + Socket.io-client 4.8 + Zustand 4.5
- **Backend:** Node.js 20 + Express 4.19 + Socket.io 4.8 + Zod
- **Canvas:** HTML5 Canvas 2D avec zoom/pan, DPR retina support
- **Déploiement:** Docker + Render.com (free tier)

## Structure Monorepo (PNPM)

```
roborally/
├── packages/
│   ├── shared/          # Types et constantes partagés
│   ├── server/          # Backend Express + Socket.io
│   └── client/          # Frontend React + Vite
├── Dockerfile.prod      # Build production multi-stage
├── docker-compose.yml   # Local development
├── render.yaml          # Render.com deployment
└── nginx.conf           # Proxy config
```

## Installation

```bash
# Prérequis: Node.js 20+, pnpm 9+
pnpm install
```

## Développement Local

```bash
# Terminal 1 - Server
pnpm --filter server dev

# Terminal 2 - Client
pnpm --filter client dev

# Ou tout ensemble:
pnpm dev
```

- Client: http://localhost:5173
- Server: http://localhost:3001

## Build Production

```bash
pnpm build
```

## Docker Local

```bash
docker-compose up --build
```

- Application: http://localhost:80
- Server API: http://localhost:3001

## Déploiement Render.com

1. Connecter votre repo GitHub à Render
2. Utiliser `render.yaml` pour la configuration automatique
3. Ou créer manuellement:
   - **Web Service:** `roborally-server` avec Dockerfile
   - **Static Site:** `roborally-client` avec build command

### Configuration manuelle Render:

**Web Service (Server):**
- Runtime: Docker
- Plan: Free
- Dockerfile Path: `./Dockerfile.prod`
- Environment Variables:
  - `NODE_ENV=production`
  - `PORT=10000`

**Static Site (Client):**
- Build Command: `npm install -g pnpm && pnpm install && pnpm build`
- Publish Directory: `./packages/client/dist`

## Fonctionnalités

### Menu Principal
- Créer/Rejoindre une room (code 4 caractères)
- Personnalisation (pseudo 1-12 chars, 8 avatars, 10 couleurs)
- Règles complètes intégrées

### Jeu Multijoueur
- 2-8 joueurs par room
- Plateau procédural NxN (8/10/11/12)
- 5 registres programmables par tour
- Drag & drop des cartes
- 5 phases de résolution animées
- Chat intégré
- Canvas avec zoom/pan

### Règles RoboRally
- Piocher 9 cartes (moins 1 par dégât)
- Programmer 5 registres
- Power Down optionnel
- Priorité: F3 > F2 > F1 > Rotation > Recul > UTurn
- Collisions avec push en chaîne
- Éléments du plateau (tapis, lasers, engrenages, repoussoirs, puits)
- 3 vies, système de dégâts, verrouillage des registres
- Victoire: toucher les 5 drapeaux dans l'ordre

## Scripts

```bash
pnpm dev          # Dev mode (server + client)
pnpm build        # Build production
pnpm lint         # ESLint
typecheck         # TypeScript check
```

## Variables d'Environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port serveur | 3001 |
| `NODE_ENV` | Environment | development |
| `VITE_SOCKET_URL` | URL Socket.io client | http://localhost:3001 |

## Architecture Socket.io Events

### Client → Server
- `room:create` - Créer une room
- `room:join` - Rejoindre une room
- `room:ready` - Toggle prêt
- `room:start` - Démarrer la partie (host)
- `game:program` - Soumettre les registres
- `chat:send` - Envoyer message

### Server → Client
- `room:update` - État complet room
- `game:started` - Partie démarrée
- `game:phase` - Phase courante
- `game:phaseUpdate` - Progression phase
- `chat:message` - Nouveau message
- `player:kicked` - Joueur expulsé

## License

MIT
