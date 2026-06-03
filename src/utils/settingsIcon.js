/** @typedef {'a' | 'm' | 'l'} SettingsIconSize */

export const SETTINGS_ICON_DIR = 'assets/image/settings'

/** Matches `137__previous.svg` style filenames. */
export const SETTINGS_ICON_FILENAME_RE = /^\d{3}__.+\.svg$/i

export function isSettingsIconFilename(value) {
  const name = String(value || '').trim().split('/').pop() || ''
  return SETTINGS_ICON_FILENAME_RE.test(name)
}

export function resolvePublicAssetUrl(path) {
  const raw = String(path || '').trim()
  if (!raw) return ''

  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('data:') ||
    raw.startsWith('blob:')
  ) {
    return raw
  }

  if (raw.startsWith('/')) return raw

  const base = import.meta.env.BASE_URL || '/'
  return `${base}${raw}`
}

/**
 * Resolves a settings icon to a public URL.
 * Accepts `010__arrow_anti-clockwise`, `010__arrow_anti-clockwise.svg`,
 * or `assets/image/settings/010__arrow_anti-clockwise.svg`.
 */
export function resolveSettingsIconUrl(icon) {
  const raw = String(icon || '').trim()
  if (!raw) return ''

  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('data:') ||
    raw.startsWith('blob:') ||
    raw.startsWith('/')
  ) {
    return raw
  }

  let path = raw
  if (!path.includes('/')) {
    if (!path.endsWith('.svg')) path = `${path}.svg`
    path = `${SETTINGS_ICON_DIR}/${path}`
  }

  return resolvePublicAssetUrl(path)
}
