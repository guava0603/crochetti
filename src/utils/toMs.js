// Shared timestamp -> epoch-ms conversion.
// Supports:
// - Firestore Timestamp (toMillis)
// - Date
// - number (already ms)
// - ISO/date strings
export function toMs(input) {
  if (input == null) return null

  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : null
  }

  if (input instanceof Date) {
    const ms = input.getTime()
    return Number.isFinite(ms) ? ms : null
  }

  // Firestore Timestamp-like: { toMillis() }
  if (typeof input === 'object' && typeof input.toMillis === 'function') {
    try {
      const ms = input.toMillis()
      return (typeof ms === 'number' && Number.isFinite(ms)) ? ms : null
    } catch {
      return null
    }
  }

  if (typeof input === 'string') {
    const s = input.trim()
    if (!s) return null
    const ms = new Date(s).getTime()
    return Number.isFinite(ms) ? ms : null
  }

  return null
}
