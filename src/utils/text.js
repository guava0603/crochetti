export function toTrimmedText(value) {
  return String(value ?? '').trim()
}

export function uniqueTrimmedStrings(list) {
  const out = []
  const seen = new Set()

  for (const raw of Array.isArray(list) ? list : []) {
    const v = toTrimmedText(raw)
    if (!v) continue
    if (seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }

  return out
}
