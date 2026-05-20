export const DEFAULT_PROJECT_CRAFT_TYPES = ['crochet']

export function normalizeProjectCraftTypes(raw) {
  const list = Array.isArray(raw) ? raw : []
  const out = []
  const seen = new Set()
  for (const item of list) {
    const value = String(item ?? '').trim()
    if (!value || value === 'knitting' || seen.has(value)) continue
    if (value === 'crochet') {
      seen.add(value)
      out.push(value)
    }
  }
  return out.length ? out : [...DEFAULT_PROJECT_CRAFT_TYPES]
}
