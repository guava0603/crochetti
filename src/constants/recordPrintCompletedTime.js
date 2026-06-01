import { toEpochMs } from '@/utils/dateTime'

export const COMPLETED_TIME_PRECISION_UNITS = Object.freeze([
  'year',
  'month',
  'day',
  'hour',
  'minute',
  'second'
])

export const DEFAULT_COMPLETED_TIME_PRECISION = 'minute'

export const DEFAULT_COMPLETED_TIME_SETTINGS = Object.freeze({
  precision: DEFAULT_COMPLETED_TIME_PRECISION
})

const INTL_OPTIONS_BY_PRECISION = Object.freeze({
  year: { year: 'numeric' },
  month: { year: 'numeric', month: '2-digit' },
  day: { year: 'numeric', month: '2-digit', day: '2-digit' },
  hour: {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false
  },
  minute: {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  },
  second: {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }
})

export function normalizeCompletedTimePrecision(raw) {
  const value = String(raw || '').trim()
  if (COMPLETED_TIME_PRECISION_UNITS.includes(value)) return value
  return DEFAULT_COMPLETED_TIME_PRECISION
}

export function normalizeCompletedTimeSettings(raw) {
  const out = { ...DEFAULT_COMPLETED_TIME_SETTINGS }
  if (!raw || typeof raw !== 'object') return out
  if ('precision' in raw) {
    out.precision = normalizeCompletedTimePrecision(raw.precision)
  }
  return out
}

export function completedTimePrecisionToIndex(precision) {
  const idx = COMPLETED_TIME_PRECISION_UNITS.indexOf(normalizeCompletedTimePrecision(precision))
  return idx >= 0 ? idx : COMPLETED_TIME_PRECISION_UNITS.indexOf(DEFAULT_COMPLETED_TIME_PRECISION)
}

export function completedTimeIndexToPrecision(index) {
  const idx = Number(index)
  if (!Number.isFinite(idx)) return DEFAULT_COMPLETED_TIME_PRECISION
  const clamped = Math.max(0, Math.min(COMPLETED_TIME_PRECISION_UNITS.length - 1, Math.round(idx)))
  return COMPLETED_TIME_PRECISION_UNITS[clamped]
}

export function formatCompletedTimeForPrint(value, precision, { locale } = {}) {
  const ms = toEpochMs(value)
  if (ms == null) return ''

  const unit = normalizeCompletedTimePrecision(precision)
  const options = INTL_OPTIONS_BY_PRECISION[unit]
  if (!options) return ''

  try {
    return new Intl.DateTimeFormat(locale, options).format(ms)
  } catch {
    try {
      return new Intl.DateTimeFormat(undefined, options).format(ms)
    } catch {
      return ''
    }
  }
}
