/** Unique, trimmed, non-empty string ids preserving first-seen order. */
export function normalizeIdList(value) {
  const list = Array.isArray(value) ? value : []
  const seen = new Set()
  const out = []
  for (const raw of list) {
    const v = String(raw ?? '').trim()
    if (!v) continue
    if (seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}
