import { ensureComponentNotesArray } from '@/utils/componentCardNotes'
import { normalizeIdList } from '@/utils/normalizeIdList'
import { isComponentType } from '@/utils/componentTypes'
import { toTrimmedText as toText } from '@/utils/text'

export function ensureStitchComponentFields(component) {
  if (!component || typeof component !== 'object') return

  if (!Array.isArray(component.related_component_ids)) {
    component.related_component_ids = []
  }

  ensureComponentNotesArray(component)
}

export function stitchSequenceNumber(componentList, componentIndex) {
  const list = Array.isArray(componentList) ? componentList : []
  const idx = Number.isFinite(Number(componentIndex)) ? Number(componentIndex) : -1
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
    if (!isComponentType(c?.type)) continue
    const id = toText(c?.id)
    if (!id) continue
    map.set(id, toText(c?.name) || `#${i + 1}`)
  }

  return map
}

export function buildRelatedComponentOptions(componentList, componentIndex) {
  const list = Array.isArray(componentList) ? componentList : []
  const idx = Number.isFinite(Number(componentIndex)) ? Number(componentIndex) : list.length
  const max = Math.min(list.length, Math.max(0, idx))

  return list
    .slice(0, max)
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => isComponentType(c?.type))
    .map(({ c, i }) => ({
      value: toText(c?.id),
      label: toText(c?.name) || `#${i + 1}`
    }))
    .filter((o) => o.value)
}

export function filterRelatedComponentIds(rawIds, allowedIds) {
  const normalized = normalizeIdList(rawIds)
  const allowed = new Set(
    (Array.isArray(allowedIds) ? allowedIds : [])
      .map((id) => toText(id))
      .filter(Boolean)
  )
  if (!allowed.size) return normalized
  return normalized.filter((id) => allowed.has(id))
}

export function relatedComponentDisplayNames(component, componentList) {
  const labelMap = buildRelatedComponentIdLabelMap(componentList)
  return normalizeIdList(component?.related_component_ids).map((id) => labelMap.get(id) || id)
}
