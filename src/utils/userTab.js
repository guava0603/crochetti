// Profile tab keys used by the home page, other users' pages and the + button.
const TAB_ALIASES = Object.freeze({
  design: ['design', 'designs', 'project', 'projects'],
  record: ['record', 'records'],
  following: ['following', 'follow', 'follows'],
  saved: ['saved', 'save', 'save-project', 'save_project', 'saved-project']
})

/**
 * Map a `?tab=` value (or alias) to a tab key.
 * @param {unknown} raw
 * @param {{ tabs?: string[], fallback?: string }} [options]
 *   `tabs`: the tabs this page actually has; anything else resolves to `fallback`.
 */
export function normalizeUserTab(raw, { tabs = Object.keys(TAB_ALIASES), fallback = 'design' } = {}) {
  const v = String(raw || '').trim().toLowerCase()
  for (const key of tabs) {
    if (TAB_ALIASES[key]?.includes(v)) return key
  }
  return fallback
}
