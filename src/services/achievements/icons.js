const DEFAULT_ICON_PATH = 'assets/image/achievement/noun-badge-3025290.svg'

const ICON_PATH_BY_ACHIEVEMENT_ID = {
  special_same_project_5_in_day: 'assets/image/achievement/noun-printer-8237877.svg',
  special_5_projects_1_days: 'assets/image/achievement/noun-crate-4687790.svg',
  special_start_record_with_10_ongoing: 'assets/image/achievement/noun-wind-8216094.svg'
}

const ICON_PATH_BY_CATEGORY = {
  // Category ids from `functions/achievements/defaults.js`
  projects: 'assets/image/achievement/noun-badge-3025290.svg',
  time: 'assets/image/achievement/noun-crocheting-7322622.svg',
  special: 'assets/image/achievement/noun-badge-3025290.svg'
}

function publicAssetUrl(path) {
  if (path == null) return ''
  const raw = String(path).trim()
  if (!raw) return ''

  // Absolute URLs (or special schemes) are already usable.
  if (/^(https?:)?\/\//i.test(raw)) return raw
  if (/^(data:|blob:|capacitor:|file:)/i.test(raw)) return raw

  const cleaned = raw.replace(/^\.\//, '')
  const base = (import.meta && import.meta.env && import.meta.env.BASE_URL) ? String(import.meta.env.BASE_URL) : '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`

  if (cleaned.startsWith('/')) return cleaned
  return `${normalizedBase}${cleaned}`
}

export function achievementIconPath(achievement) {
  const id = achievement?.id != null ? String(achievement.id) : ''
  if (id && ICON_PATH_BY_ACHIEVEMENT_ID[id]) return ICON_PATH_BY_ACHIEVEMENT_ID[id]

  const category = achievement?.category != null ? String(achievement.category) : ''
  return ICON_PATH_BY_CATEGORY[category] || DEFAULT_ICON_PATH
}

export function achievementIconUrl(achievement) {
  return publicAssetUrl(achievementIconPath(achievement))
}
