import { ensureComponentNotesArray } from '@/utils/componentCardNotes'
import { normalizeIdList } from '@/utils/normalizeIdList'
import { isStitchType } from '@/utils/componentTypes'
import { toTrimmedText as toText } from '@/utils/text'

function relatedComponentOptionLabel(component, listIndex, componentList) {
  const name = toText(component?.name)
  if (name) return name
  if (isStitchType(component?.type)) {
    return `#${stitchSequenceNumber(componentList, listIndex)}`
  }
  return `#${listIndex + 1}`
}

export function ensureStitchComponentFields(component) {
  if (!component || typeof component !== 'object') return

  if (!Array.isArray(component.related_component_ids)) {
    component.related_component_ids = []
  }

  ensureComponentNotesArray(component)
}

/** Index of `component` in `componentList`, preferring a valid explicit index when it matches. */
export function resolveComponentIndexInList(componentList, component, explicitIndex) {
  const list = Array.isArray(componentList) ? componentList : []
  const n = Number(explicitIndex)

  if (Number.isFinite(n) && n >= 0 && n < list.length) {
    if (!component || typeof component !== 'object') return n
    const at = list[n]
    if (at === component) return n
    const cid = toText(component?.id)
    const aid = toText(at?.id)
    if (cid && aid && cid === aid) return n
  }

  if (component && typeof component === 'object') {
    const cid = toText(component.id)
    if (cid) {
      const byId = list.findIndex((c) => toText(c?.id) === cid)
      if (byId >= 0) return byId
    }
    const byRef = list.indexOf(component)
    if (byRef >= 0) return byRef
  }

  if (Number.isFinite(n) && n >= 0 && n < list.length) return n
  return -1
}

export function stitchSequenceNumber(componentList, componentIndex, component = null) {
  const list = Array.isArray(componentList) ? componentList : []
  const idx = resolveComponentIndexInList(list, component, componentIndex)
  if (!list.length || idx < 0) return 1

  const max = Math.min(list.length - 1, idx)
  let count = 0
  for (let i = 0; i <= max; i += 1) {
    if (list[i]?.type === 'stitch') count += 1
  }
  return Math.max(1, count)
}

export function buildRelatedComponentIdLabelMap(componentList) {
  const list = Array.isArray(componentList) ? componentList : []
  const map = new Map()

  for (let i = 0; i < list.length; i += 1) {
    const c = list[i]
    if (!c || typeof c !== 'object') continue
    const id = toText(c?.id)
    if (!id) continue
    map.set(id, relatedComponentOptionLabel(c, i, list))
  }

  return map
}

export function buildRelatedComponentOptions(componentList, componentIndex, component = null) {
  const list = Array.isArray(componentList) ? componentList : []
  const idx = resolveComponentIndexInList(list, component, componentIndex)
  if (idx <= 0) return []

  return list
    .slice(0, idx)
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c && toText(c?.id))
    .map(({ c, i }) => ({
      value: toText(c.id),
      label: relatedComponentOptionLabel(c, i, list)
    }))
}

export function filterRelatedComponentIds(rawIds, allowedIds) {
  const normalized = normalizeIdList(rawIds)
  const allowed = new Set(
    (Array.isArray(allowedIds) ? allowedIds : [])
      .map((id) => toText(id))
      .filter(Boolean)
  )
  if (!allowed.size) return []
  return normalized.filter((id) => allowed.has(id))
}

export function relatedComponentDisplayNames(component, componentList) {
  const labelMap = buildRelatedComponentIdLabelMap(componentList)
  return normalizeIdList(component?.related_component_ids).map((id) => labelMap.get(id) || id)
}
