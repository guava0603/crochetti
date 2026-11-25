import { BasicStitchGeneral, CROCHET_LANG, getCrochetZhText } from '@/constants/crochetData'
import { TREBLE_CROCHET_STITCH_INDEX } from '@/constants/userCrochetDisplay'

const displayCache = {
  aliases: {},
  userStitches: []
}

export function setUserCrochetDisplayCache({ aliases, userStitches } = {}) {
  displayCache.aliases = aliases && typeof aliases === 'object' ? { ...aliases } : {}
  displayCache.userStitches = Array.isArray(userStitches) ? userStitches : []
}

export function getUserCrochetDisplayCache() {
  return displayCache
}

export function getBuiltinStitchTextLabel(stitch) {
  if (!stitch?.nameKey) return ''
  return getCrochetZhText(stitch.nameKey)
}

export function buildBuiltinAliasDraft(aliases) {
  const saved = normalizeStitchDisplayAliases(aliases)
  const draft = {}
  for (const stitch of BasicStitchGeneral) {
    const id = String(stitch.index)
    const defaultLabel = getBuiltinStitchTextLabel(stitch)
    draft[id] = saved[id] || defaultLabel
  }
  return draft
}

export function buildBuiltinAliasesToSave(draftAliases) {
  const draft = draftAliases && typeof draftAliases === 'object' ? draftAliases : {}
  const out = {}
  for (const stitch of BasicStitchGeneral) {
    const id = String(stitch.index)
    const value = String(draft[id] ?? '').trim()
    const defaultLabel = getBuiltinStitchTextLabel(stitch)
    if (!value || value === defaultLabel) continue
    out[id] = value
  }
  return out
}

export function normalizeStitchDisplayAliases(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out = {}
  for (const [key, value] of Object.entries(raw)) {
    const id = Number(key)
    if (!Number.isFinite(id)) continue
    const label = String(value ?? '').trim()
    if (!label) continue
    out[String(id)] = label
  }
  return out
}

export function normalizeUserSelfDefinedStitches(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const id = Number(item.stitch_id)
      if (!Number.isFinite(id)) return null
      const name = String(item.name || '').trim()
      if (!name) return null
      const symbolJp = String(item.symbol_jp || '').trim()
      const textZh = String(item.text_zh || '').trim()
      const displayLabel = String(item.display_label || '').trim()
      const description = String(item.description || '').trim()
      const consume = Number(item.consume)
      const generate = Number(item.generate)
      return {
        stitch_id: id,
        name,
        symbol_jp: symbolJp || undefined,
        text_zh: textZh || undefined,
        display_label: displayLabel || undefined,
        description,
        consume: Number.isFinite(consume) ? consume : 1,
        generate: Number.isFinite(generate) ? generate : 0
      }
    })
    .filter(Boolean)
}

export function getBuiltinCustomDisplayText(stitch) {
  if (!stitch) return ''
  const id = stitch.index
  if (id === null || id === undefined) return ''
  const alias = String(displayCache.aliases[String(id)] || '').trim()
  if (alias) return alias
  return getBuiltinStitchTextLabel(stitch)
}

export function getSelfDefinedCustomDisplayText(stitch) {
  if (!stitch) return ''
  const displayLabel = String(stitch.display_label || '').trim()
  if (displayLabel) return displayLabel
  const textZh = String(stitch.text_zh || '').trim()
  if (textZh) return textZh
  return String(stitch.name || '').trim()
}

export function getCustomModeStitchDisplayText(stitch, stitchId) {
  if (!stitch) return ''
  const id = Number(stitchId ?? stitch.index ?? stitch.stitch_id)
  if (Number.isFinite(id) && id >= 0) {
    return getBuiltinCustomDisplayText(stitch)
  }
  return getSelfDefinedCustomDisplayText(stitch)
}

export function hasCustomDisplaySettings(aliases, userStitches) {
  const normalizedAliases = normalizeStitchDisplayAliases(aliases)
  if (Object.keys(normalizedAliases).length > 0) return true
  return normalizeUserSelfDefinedStitches(userStitches).length > 0
}

export function splitGeneralStitchesAroundTreble(stitches) {
  const list = Array.isArray(stitches) ? stitches : []
  const splitIndex = list.findIndex((s) => Number(s?.index) === TREBLE_CROCHET_STITCH_INDEX)
  if (splitIndex < 0) {
    return { before: list, after: [] }
  }
  return {
    before: list.slice(0, splitIndex + 1),
    after: list.slice(splitIndex + 1)
  }
}

export function getNextUserSelfDefinedStitchId(userStitches) {
  const list = normalizeUserSelfDefinedStitches(userStitches)
  const ids = list.map((s) => Number(s.stitch_id)).filter((n) => Number.isFinite(n))
  const minId = ids.length ? Math.min(...ids) : 0
  return minId < 0 ? minId - 1 : -1
}

export function mergeSelfDefinedStitchLists(userStitches, projectStitches) {
  const user = normalizeUserSelfDefinedStitches(userStitches)
  const project = normalizeUserSelfDefinedStitches(projectStitches)
  const seen = new Set(user.map((s) => Number(s.stitch_id)))
  const out = [...user]
  for (const stitch of project) {
    const id = Number(stitch.stitch_id)
    if (seen.has(id)) continue
    seen.add(id)
    out.push(stitch)
  }
  return out
}

export function isCustomCrochetLang(crochetLang) {
  return Number(crochetLang) === CROCHET_LANG.custom
}
