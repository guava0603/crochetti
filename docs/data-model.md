# Corchetti data model and storage locations

This document lists **what data exists in the app**, **where it is stored today**, and **where new data should go**. Update this file whenever you add a persisted field, collection, Storage path, or `localStorage` key.

**Related code**

| Area | Entry points |
|------|----------------|
| Firestore offline cache | `src/firebaseConfig.js` |
| Projects | `src/services/firestore/projects.js` |
| Records | `src/services/firestore/records.js` |
| Public profile | `src/services/firestore/user.js` |
| Friend codes | `src/services/firestore/friendCode.js` |
| Achievements (earned) | `src/services/firestore/achievements.js`, `src/services/achievementService.js` |
| Security rules | `firestore.rules` |
| UI locale | `src/i18n/index.js` |
| Crochet display lang | `src/composables/useCrochetLang.js` |
| Last opened record | `src/utils/lastAccessedRecord.js` |

---

## Decision guide (use for every new field)

| Question | Store in |
|----------|----------|
| Must survive reinstall, sync across devices, or be visible to other users? | **Firestore** (+ **Firebase Storage** if binary) |
| Large binary (photos)? | **Storage**; keep HTTPS URL(s) in Firestore |
| Same for all users, ships with the app version? | **App bundle** (code + `src/locales/*.json`) |
| Per-device UX only; OK to lose on “clear site data”? | **`localStorage`** |
| Current tab / session only? | **Pinia or component state** (never Firestore) |
| Server-only maintenance or admin? | **Firestore** `_maintenance/…` or **Cloud Functions** |

**Do not** put design or recording progress only in `localStorage`: `component_list`, `time_slots`, `self_defined_stitches`, achievement earned state, or social graph data.

---

## Storage layers

| Layer | Role |
|-------|------|
| **Firestore** | Authoritative user and shared data |
| **Firebase Storage** | Project and record images |
| **Firebase Auth** | Identity (`uid`, email, providers) |
| **App bundle** | Static catalogs (stitches, achievement definitions, avatar presets, i18n) |
| **`localStorage`** | Device UX preferences and resume hints |
| **Pinia** | Session cache (refetch from Firestore on load) |
| **Firestore offline cache (IndexedDB)** | Automatic SDK cache; not a separate source of truth |

---

## 1. Static / catalog data (app bundle)

Never store these per-user in Firestore as the primary catalog.

| Data | Location | Notes |
|------|----------|--------|
| Crochet stitch catalog | `src/constants/crochetData.js` | `stitch_id` values are referenced in user projects; avoid reindexing |
| Achievement definitions | `src/services/achievements/catalog.js` | Client reads catalog from code |
| Achievement icons / evaluators | `src/services/achievements/icons.js`, `evaluators.js` | |
| Avatar preset list | `src/constants/avatarPresets.js` | Profile stores selected id or legacy path only |
| UI strings | `src/locales/en.json`, `zh-TW.json` | |
| Craft / component types | `src/constants/projectCraft.js`, `src/utils/componentTypes.js` | DB `craft_types` should normalize to `['crochet']` |

**Legacy:** Firestore collection `/achievements/{id}` may still be synced by Cloud Functions for ops/backfill. **The web client does not read the catalog from Firestore** (`fetchAllAchievements` uses local catalog). Earned badges use `/users/{uid}/earnedAchievements` only.

---

## 2. Firebase Auth

| Field | Storage |
|-------|---------|
| `uid`, `email`, `displayName`, `photoURL`, `isAnonymous`, `providerData` | **Auth** |

Use Auth display fields only to **bootstrap** an empty Firestore profile (`useCurrentUserProfile.js`). Display name and avatar for the app should live in the profile doc once set.

---

## 3. Projects — `projects/{projectId}`

| Field | Type / purpose | Storage |
|-------|----------------|---------|
| `name`, `description` | Metadata | Firestore |
| `authorId` | Owner uid | Firestore |
| `is_public` | Public project page | Firestore |
| `craft_types` | e.g. `['crochet']` | Firestore; strip `knitting` on save (`normalizeProjectCraftTypes`) |
| `materials.hook`, `materials.yarn` | Tools / yarn | Firestore |
| `materials.needle` | Legacy | Omit or clear on save (UI removed) |
| `component_list[]` | Design (see below) | Firestore |
| `self_defined_stitches[]` | Custom stitches | Firestore |
| `images[]` | Cover URLs (max 3) | Firestore |
| `image` | Legacy single cover | Firestore (prefer `images`) |
| `record.ongoing_list`, `record.completed_list` | Record id lists on public projects | Firestore |
| `created_at`, `updated_at`, `createdAt` | Timestamps | Firestore |

### `component_list[]` item shape (summary)

| Field | Used on |
|-------|---------|
| `type` | `stitch` \| `component-crochet` \| legacy `component` |
| `name`, `count`, `notes` | All |
| `content.type` | Cast-on for part components |
| `content.row_list` | Crochet rows, groups, nodes (stitch / bundle / pattern / rope) |

### `self_defined_stitches[]` item shape

`stitch_id`, `name`, `symbol_jp`, `text_zh`, `description`, `consume`, `generate`

### Project images (Storage)

| Path | Storage |
|------|---------|
| `projects/{projectId}/images/{uuid}.{ext}` | **Storage** → URL in `images[]` |

**Service:** `src/services/firestore/projects.js`, uploads in `AddProjectView` / `EditProjectView`.

---

## 4. User records — `users/{uid}/records/{recordId}`

Private to owner (`firestore.rules`).

| Field | Purpose | Storage |
|-------|---------|---------|
| `project_id`, `project_name`, `project_image` | Link + display | Firestore |
| `component_list[]` | Per-instance progress (`end_at`, `is_completed`, `count`, `_instance`) | Firestore |
| `time_slots[]` | `start`, `end`, `status_id`, `status_note`, `end_at_list` | Firestore |
| `self_defined_status[]` | Custom status ids **linked on this record** (subset of user catalog) | Firestore |
| `self_defined_status_notes[]` | Legacy per-record notes (migrated to profile on load) | Firestore |
| `pending_status_id`, `pending_status_note` | Status before first slot | Firestore |
| `percentage` | 0–100 (computed on save) | Firestore |
| `is_completed`, `completed_at` | Finished record | Firestore |
| `synced_at` | Last alignment with project design | Firestore |
| `last_selected_component_index` | Resume component tab | Firestore |
| `result` | `{ images[], thought }` | Firestore |
| `created_at`, `updated_at` | Timestamps | Firestore |

**Defaults on create** (`src/services/records/startRecordForProject.js`): `time_slots: []`, `self_defined_status: []`, `synced_at` set to create time.

### Record result images (Storage)

| Path | Storage |
|------|---------|
| `users/{uid}/records/{recordId}/result/{uuid}.{ext}` | **Storage** → URL in `result.images` |

**Service:** `src/services/firestore/records.js`, upload in `RecordView`.

---

## 5. Public profile — `artifacts/{appId}/users/{uid}/profile/info`

| Field | Purpose | Storage |
|-------|---------|---------|
| `name`, `avatar` | Public display | Firestore |
| `is_privacy` | Hide content from non-owner | Firestore |
| `friend_code` / `friendCode` | 6-character code | Firestore |
| `friend_code_updated_at` | Regenerate audit | Firestore |
| `crochet_lang` | Stitch display mode (number enum) | Firestore + `localStorage` cache |
| `save_project_list[]` | Bookmarked project ids | Firestore |
| `following_list[]`, `fan_list[]` | Social graph | Firestore |
| `avatar_used_ids[]` | Avatar achievement tracking | Firestore |
| `record_status_catalog[]` | User-defined status categories `{ id, name }` (ids ≥ 100), shared across projects/records | Firestore |
| `record_status_notes[]` | Saved status notes `{ status_id, description }` keyed by category, shared across projects/records | Firestore |

**Service:** `src/services/firestore/user.js`, `ProfileSettingsModal`, `HomeView`, `useUserRecordStatusCatalog`.

---

## 6. Friend code index — `artifacts/{appId}/public/data/short_ids/{CODE}`

Denormalized lookup (6 uppercase alphanumeric chars).

| Field | Storage |
|-------|---------|
| `uid`, `name`, `avatar`, `created_at`, `updated_at` | Firestore |

Keep in sync when profile name/avatar changes. **Service:** `src/services/firestore/friendCode.js`.

---

## 7. Public record summaries — `artifacts/{appId}/users/{uid}/records/{recordId}`

Sanitized for public user pages. Rules allow only:

| Field | Storage |
|-------|---------|
| `project_id`, `project_name` | Firestore |
| `percentage` | Firestore (optional, 0–100) |
| `result.images`, `result.thought` | Firestore |

Do **not** mirror full `time_slots` or `component_list` here. **Service:** `upsertPublicUserRecordSummary` in `records.js`.

---

## 8. Achievements (per user)

| Path | Data | Storage |
|------|------|---------|
| `users/{uid}/earnedAchievements/{achievementId}` | `earnedAt` | Firestore |
| `users/{uid}` (root doc) | `lastAchievementCheck`, `lastAchievementVersionSeen` | Firestore |

Catalog definitions: **app bundle only** (see §1). **Store:** `src/stores/achievementStore.js`.

---

## 9. Wishes — `wishes/{wishId}`

| Field | Storage |
|-------|---------|
| `description`, `user_id`, `email`, `status`, `is_completed`, `reply`, `created_at`, `updated_at` | Firestore |

Client: create only. Read/update: admin (rules deny client read). **Service:** `src/services/firestore/wishes.js`.

---

## 10. Server maintenance — `_maintenance/achievements`

| Field | Storage |
|-------|---------|
| `backfillKey` | Firestore (not client-readable) |

Used by Cloud Functions for achievement catalog sync / backfill. See `functions/index.js` and README ops section.

---

## 11. Device-only — `localStorage`

| Key | Data | Also in Firestore? |
|-----|------|-------------------|
| `corchetti.locale` | UI language (`en`, `zh-TW`) | No (device-only today) |
| `corchetti.crochet_lang` | Crochet display mode | Yes — `profile.crochet_lang` when signed in |
| `{appId}:lastAccessedRecordId` | Resume last record id | No (convenience; record body in Firestore) |

Implementations: `src/i18n/index.js`, `src/composables/useCrochetLang.js`, `src/utils/lastAccessedRecord.js`.

---

## 12. Session-only (do not persist)

| Data | Storage |
|------|---------|
| Crochet table edit buffer, wizard step, modal state, carousel index | Memory |
| Optimistic follow list before Firestore confirms | Memory |
| Draft project wizard before submit | Memory |
| `latestRecordStore` cache | Memory — refetch via `fetchUserRecord` |

---

## 13. Cloud Functions (reference)

| Callable / HTTP | Purpose |
|-----------------|--------|
| `isPublic` | Project visibility check |
| `getUsersPublicProfiles` | Batch public profiles |
| `syncAchievementsFromCodeHttp` / daily schedule | Sync code catalog → Firestore `/achievements` (ops; client uses local catalog) |

---

## Maintenance checklist

When you change persistence, update this doc and the matching row in the table above:

- [ ] New Firestore path or field
- [ ] New Storage path pattern
- [ ] New `localStorage` / `sessionStorage` key
- [ ] Moved catalog from Firestore to code (or reverse)
- [ ] Security rules change in `firestore.rules`
- [ ] Public vs private visibility change

---

## Quick reference: what must stay in Firestore

| Must be Firestore | Can be local only |
|-------------------|-------------------|
| Projects, records, profile, social lists | UI locale (`corchetti.locale`) |
| Earned achievements, friend code mapping | `lastAccessedRecordId` (hint only) |
| Image URLs, wishes (create payload) | Crochet lang cache (mirror of profile) |
| Public record summaries | Ephemeral UI state |
