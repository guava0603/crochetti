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

## Achievements (Firestore Catalog)

This app expects a global achievements catalog in Firestore at collection `achievements`.
Clients are read-only for this catalog (by rules), so the collection is created/updated by Firebase Functions.

### 1) Deploy Functions

```sh
firebase deploy --only functions
```

### 2) Set maintenance key

In Firestore, create this document:

- Path: `_maintenance/achievements`
- Field: `backfillKey` (string)

### 3) Sync catalog from code -> Firestore

Call the HTTP function (replace placeholders):

```sh
curl -X POST "https://us-central1-<YOUR_PROJECT_ID>.cloudfunctions.net/syncAchievementsFromCodeHttp?key=<BACKFILL_KEY>&force=true"
```

After this, you should see the `achievements` collection appear in Firestore.

Notes:
- `force=true` bumps `publishedDate` so existing users will run a retroactive scan on next login.
- There is also a daily scheduled sync that keeps the catalog aligned with code.
