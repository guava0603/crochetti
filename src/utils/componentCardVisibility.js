/** Resolves component-card section visibility; omitted keys use `defaults`. */
export function resolveComponentCardVisibility(raw, defaults) {
  if (!raw || typeof raw !== 'object') {
    return { ...defaults }
  }

  const out = {}
  for (const [key, defaultVisible] of Object.entries(defaults)) {
    out[key] = raw[key] !== false
  }
  return out
}
