# corchetti

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Data model

Where each kind of data lives (Firestore, Storage, Auth, `localStorage`, app bundle) and rules for adding new fields:

**[docs/data-model.md](docs/data-model.md)**

Update that doc when you add persisted fields or collections.

## Achievements (ops / optional Firestore sync)

The **client** reads achievement definitions from code (`src/services/achievements/catalog.js`). Per-user earned badges are in Firestore at `users/{uid}/earnedAchievements/{id}`.

Cloud Functions can still sync the legacy global collection `/achievements` from code for maintenance. See `docs/data-model.md` §1 and §10.

### Deploy Functions

```sh
firebase deploy --only functions
```

### Maintenance key (optional sync)

In Firestore: `_maintenance/achievements` with field `backfillKey` (string).

### Sync catalog code → Firestore (optional)

```sh
curl -X POST "https://us-central1-<YOUR_PROJECT_ID>.cloudfunctions.net/syncAchievementsFromCodeHttp?key=<BACKFILL_KEY>&force=true"
```

There is also a daily scheduled sync in Functions. This does not change the client catalog source (still the app bundle).
