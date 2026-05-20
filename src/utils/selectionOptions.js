import { toTrimmedText as toText } from '@/utils/text'

export function normalizeSelectionOption(raw) {
  if (raw == null) return null

  if (typeof raw === 'string') {
    const v = toText(raw)
    return v ? { value: v, label: v } : null
  }

  if (typeof raw !== 'object') return null

  const value = toText(raw.value)
  const label = toText(raw.label)
  if (!value) return null

  return { value, label: label || value }
}

export function normalizeSelectionOptions(rawOptions) {
  const list = Array.isArray(rawOptions) ? rawOptions : []
  if (list.length === 0) return []

  const seen = new Set()
  const out = []
  for (const raw of list) {
    const opt = normalizeSelectionOption(raw)
    if (!opt) continue
    if (seen.has(opt.value)) continue
    seen.add(opt.value)
    out.push(opt)
  }
  return out
}

export function normalizeSelectionSuggestions(rawSuggestions) {
  const list = Array.isArray(rawSuggestions) ? rawSuggestions : []
  if (list.length === 0) return []

  const seen = new Set()
  const out = []
  for (const raw of list) {
    const v = toText(raw)
    if (!v) continue
    if (seen.has(v)) continue
    seen.add(v)
    out.push({ value: v, label: v })
  }
  return out
}

export function getAvailableSelectionOptions({ options, suggestions }) {
  const normalized = normalizeSelectionOptions(options)
  if (normalized.length) return normalized
  return normalizeSelectionSuggestions(suggestions)
}

export function buildValueLabelMap(options) {
  const list = Array.isArray(options) ? options : []
  const map = new Map()
  for (const opt of list) {
    if (!opt?.value) continue
    if (!map.has(opt.value)) map.set(opt.value, opt.label || opt.value)
  }
  return map
}
