function toValidDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }

  if (typeof value === 'string') {
    const s = value.trim()
    if (!s) return null
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? null : d
  }

  return null
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

export function toEpochMs(value) {
  const date = toValidDate(value)
  if (!date) return null
  const ms = date.getTime()
  return Number.isFinite(ms) ? ms : null
}

export function formatDateTime(value, options = {}) {
  const date = toValidDate(value)
  if (!date) return ''

  const {
    locale = undefined,
    year = 'numeric',
    month = '2-digit',
    day = '2-digit',
    hour = '2-digit',
    minute = '2-digit',
    second = undefined
  } = options || {}

  const fmtOptions = {
    year,
    month,
    day,
    hour,
    minute,
    ...(second ? { second } : {})
  }

  try {
    return date.toLocaleString(locale, fmtOptions)
  } catch {
    try {
      // Best-effort fallback using Intl.
      return new Intl.DateTimeFormat(locale, fmtOptions).format(date)
    } catch {
      return String(date)
    }
  }
}

export function formatDateTimeNoSeconds(value, options = {}) {
  return formatDateTime(value, {
    ...options,
    second: undefined
  })
}

export function formatDateTimeWithSeconds(value, options = {}) {
  return formatDateTime(value, {
    ...options,
    second: '2-digit'
  })
}

// ISO string -> <input type="datetime-local"> value (with seconds)
// Uses local time fields.
export function isoToDatetimeLocal(value) {
  const date = toValidDate(value)
  if (!date) return ''

  const y = date.getFullYear()
  const m = pad2(date.getMonth() + 1)
  const d = pad2(date.getDate())
  const hh = pad2(date.getHours())
  const mm = pad2(date.getMinutes())
  const ss = pad2(date.getSeconds())
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}`
}

// <input type="datetime-local"> value -> ISO string
// Interprets the input as local time.
export function datetimeLocalToIso(localStr) {
  const raw = String(localStr || '').trim()
  if (!raw) return null
  const ms = new Date(raw).getTime()
  if (!Number.isFinite(ms)) return null
  return new Date(ms).toISOString()
}

export function getStartHourKey(value, { unknown = '__unknown__' } = {}) {
  const date = toValidDate(value)
  if (!date) return unknown

  const y = date.getFullYear()
  const m = pad2(date.getMonth() + 1)
  const d = pad2(date.getDate())
  const hour = pad2(date.getHours())
  return `${y}-${m}-${d} ${hour}`
}

export function formatStartHourLabel(value, { unknown = '' } = {}) {
  const date = toValidDate(value)
  if (!date) return unknown

  const y = date.getFullYear()
  const m = pad2(date.getMonth() + 1)
  const d = pad2(date.getDate())
  const hour = pad2(date.getHours())
  return `${y}/${m}/${d} ${hour}:00`
}

// Compact timestamp display:
// - same day: HH:MM
// - same year: MM/DD
// - else: YYYY/MM/DD
export function formatDateTimeCompact(value, { now = Date.now() } = {}) {
  const date = toValidDate(value)
  if (!date) return ''

  const nowDate = toValidDate(now) || new Date()

  const isSameDay = date.getFullYear() === nowDate.getFullYear() &&
    date.getMonth() === nowDate.getMonth() &&
    date.getDate() === nowDate.getDate()

  const isSameYear = date.getFullYear() === nowDate.getFullYear()

  if (isSameDay) {
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
  }

  if (isSameYear) {
    return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`
  }

  return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`
}
