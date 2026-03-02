// Central place for the initial global achievements catalog.
// Used by the seeding function because clients cannot write to `/achievements`.
//
// Shape matches the Firestore payload fields (except `publishedDate`, which is stamped server-side).

/**
 * @typedef {Object} SeedAchievement
 * @property {string} id
 * @property {string} category Category id (used for grouping in UI)
 * @property {'brown'|'silver'|'gold'} tier Visual tier for frames (easy -> hard)
 * @property {string} nameKey i18n key for the localized name
 * @property {string} descriptionKey i18n key for the localized description
 * @property {string} conditionType
 * @property {number} conditionValue
 * @property {string} [conditionUnit]
 * @property {number|null} [version]
 */

/** @type {SeedAchievement[]} */
const DEFAULT_ACHIEVEMENTS = [
  {
    id: 'projects_1',
    category: 'projects',
    tier: 'brown',
    nameKey: 'achievement.catalog.projects_1.name',
    descriptionKey: 'achievement.catalog.projects_1.description',
    conditionType: 'total_projects',
    conditionValue: 1,
    conditionUnit: 'count',
    version: 1
  },
  {
    id: 'projects_5',
    category: 'projects',
    tier: 'silver',
    nameKey: 'achievement.catalog.projects_5.name',
    descriptionKey: 'achievement.catalog.projects_5.description',
    conditionType: 'total_projects',
    conditionValue: 5,
    conditionUnit: 'count',
    version: 1
  },
  {
    id: 'projects_50',
    category: 'projects',
    tier: 'gold',
    nameKey: 'achievement.catalog.projects_50.name',
    descriptionKey: 'achievement.catalog.projects_50.description',
    conditionType: 'total_projects',
    conditionValue: 50,
    conditionUnit: 'count',
    version: 1
  },
  {
    id: 'time_1h',
    category: 'time',
    tier: 'brown',
    nameKey: 'achievement.catalog.time_1h.name',
    descriptionKey: 'achievement.catalog.time_1h.description',
    conditionType: 'total_time',
    conditionValue: 3600000,
    conditionUnit: 'ms',
    version: 1
  },
  {
    id: 'time_10h',
    category: 'time',
    tier: 'silver',
    nameKey: 'achievement.catalog.time_10h.name',
    descriptionKey: 'achievement.catalog.time_10h.description',
    conditionType: 'total_time',
    conditionValue: 36000000,
    conditionUnit: 'ms',
    version: 1
  },
  {
    id: 'time_50h',
    category: 'time',
    tier: 'gold',
    nameKey: 'achievement.catalog.time_50h.name',
    descriptionKey: 'achievement.catalog.time_50h.description',
    conditionType: 'total_time',
    conditionValue: 180000000,
    conditionUnit: 'ms',
    version: 1
  }
]

module.exports = {
  DEFAULT_ACHIEVEMENTS
}
