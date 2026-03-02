/**
 * Resolve localized achievement text.
 *
 * Achievements can come from Firestore with either:
 * - `nameKey` / `descriptionKey` (preferred)
 * - legacy `name` / `description` literal strings (fallback)
 */

function safeString(value) {
  return value != null ? String(value) : ''
}

/**
 * @param {any} achievement
 * @param {{t: Function, te?: Function}} i18n
 * @param {string} fallback
 */
export function resolveAchievementName(achievement, i18n, fallback = '') {
  const key = safeString(achievement?.nameKey).trim()
  if (key) {
    try {
      if (typeof i18n?.te === 'function' && i18n.te(key)) return safeString(i18n.t(key))
      const translated = safeString(i18n?.t?.(key))
      if (translated && translated !== key) return translated
    } catch {
      // ignore and fallback
    }
  }

  const raw = safeString(achievement?.name).trim()
  return raw || fallback
}

/**
 * @param {any} achievement
 * @param {{t: Function, te?: Function}} i18n
 * @param {string} fallback
 */
export function resolveAchievementDescription(achievement, i18n, fallback = '') {
  const key = safeString(achievement?.descriptionKey).trim()
  if (key) {
    try {
      if (typeof i18n?.te === 'function' && i18n.te(key)) return safeString(i18n.t(key))
      const translated = safeString(i18n?.t?.(key))
      if (translated && translated !== key) return translated
    } catch {
      // ignore and fallback
    }
  }

  const raw = safeString(achievement?.description).trim()
  return raw || fallback
}
