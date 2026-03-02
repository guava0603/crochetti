/**
 * Local achievements catalog.
 *
 * Source of truth for achievement definitions used by the client.
 * Firestore should only store per-user earned achievement IDs (doc ids) and
 * optional earned metadata (e.g. earnedAt).
 */

/**
 * @typedef {Object} LocalAchievement
 * @property {string} id
 * @property {string} category
 * @property {'brown'|'silver'|'gold'|'special'} tier
 * @property {string} nameKey
 * @property {string} descriptionKey
 * @property {string} conditionType
 * @property {number} conditionValue
 * @property {string} [conditionUnit]
 * @property {number|null} [version]
 */

/** @type {ReadonlyArray<LocalAchievement>} */
export const ACHIEVEMENT_CATALOG = Object.freeze([
  // projects
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

  // time
  {
    id: 'time_1h',
    category: 'time',
    tier: 'brown',
    nameKey: 'achievement.catalog.time_1h.name',
    descriptionKey: 'achievement.catalog.time_1h.description',
    conditionType: 'total_time',
    // milliseconds
    conditionValue: 60 * 60 * 1000,
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
    conditionValue: 10 * 60 * 60 * 1000,
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
    conditionValue: 50 * 60 * 60 * 1000,
    conditionUnit: 'ms',
    version: 1
  },

  // special
  {
    id: 'special_same_project_5_in_day',
    category: 'special',
    tier: 'special',
    nameKey: 'achievement.catalog.special_same_project_5_in_day.name',
    descriptionKey: 'achievement.catalog.special_same_project_5_in_day.description',
    conditionType: 'custom',
    conditionValue: 1,
    conditionUnit: 'bool',
    version: 1
  },
  {
    id: 'special_start_record_with_10_ongoing',
    category: 'special',
    tier: 'special',
    nameKey: 'achievement.catalog.special_start_record_with_10_ongoing.name',
    descriptionKey: 'achievement.catalog.special_start_record_with_10_ongoing.description',
    conditionType: 'custom',
    conditionValue: 1,
    conditionUnit: 'bool',
    version: 1
  },
  {
    id: 'special_5_projects_1_days',
    category: 'special',
    tier: 'special',
    nameKey: 'achievement.catalog.special_5_projects_1_days.name',
    descriptionKey: 'achievement.catalog.special_5_projects_1_days.description',
    conditionType: 'custom',
    conditionValue: 1,
    conditionUnit: 'bool',
    version: 1
  }
])

/**
 * @returns {LocalAchievement[]}
 */
export function listLocalAchievements() {
  return ACHIEVEMENT_CATALOG.slice()
}

/**
 * @param {string} achievementId
 * @returns {LocalAchievement|null}
 */
export function getLocalAchievementById(achievementId) {
  const id = achievementId != null ? String(achievementId).trim() : ''
  if (!id) return null

  for (const a of ACHIEVEMENT_CATALOG) {
    if (a?.id === id) return a
  }

  return null
}
