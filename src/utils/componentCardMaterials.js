import {
  componentYarnDisplayLines,
  mergeYarnMetaWithTypes,
  normalizeComponentYarnSelection,
  normalizeYarnMetaList,
  stripComponentYarnAmountMetadata,
  yarnMetaIdMap,
  yarnMetaOptions
} from '@/utils/yarnMeta'
import { toTrimmedText as toText, uniqueTrimmedStrings } from '@/utils/text'

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value.map((v) => toText(v)).filter(Boolean)
  }
  const s = toText(value)
  return s ? [s] : []
}

function uniqueList(list) {
  return uniqueTrimmedStrings(list)
}

function mergeMaterialOptions(base, extra) {
  return uniqueList([...(Array.isArray(base) ? base : []), ...(Array.isArray(extra) ? extra : [])])
}

export function initComponentMaterialMetadata(component) {
  if (!component || typeof component !== 'object') return

  if (!component.metadata || typeof component.metadata !== 'object') {
    component.metadata = { yarn: [], hook: [], needle: [] }
  } else {
    if (component.metadata.yarn == null) component.metadata.yarn = []
    if (component.metadata.hook == null) component.metadata.hook = []
    if (component.metadata.needle == null) component.metadata.needle = []
  }

  component.metadata = stripComponentYarnAmountMetadata(component.metadata)
}

/** Normalizes hook/yarn/needle fields on a component (in-place). */
export function normalizeComponentMaterials(component, materials) {
  if (!component || typeof component !== 'object') return

  initComponentMaterialMetadata(component)

  const baseYarnMeta = normalizeYarnMetaList(materials?.yarn)
  const baseYarnIdMap = yarnMetaIdMap(baseYarnMeta)

  const legacyYarn = typeof component.metadata?.yarn === 'string' ? component.metadata.yarn : null
  const legacyHook = typeof component.metadata?.hook === 'string' ? component.metadata.hook : null
  const legacyNeedle = typeof component.metadata?.needle === 'string' ? component.metadata.needle : null

  const yarnRaw =
    component.yarn == null
      ? legacyYarn
        ? normalizeStringList(legacyYarn)
        : []
      : normalizeStringList(component.yarn)

  if (baseYarnMeta.length > 0) {
    const unknownAsTypes = yarnRaw.filter((v) => !baseYarnIdMap.has(toText(v)))
    const effectiveYarnMeta = mergeYarnMetaWithTypes(baseYarnMeta, unknownAsTypes)
    component.yarn = normalizeComponentYarnSelection(yarnRaw, effectiveYarnMeta)
  } else {
    component.yarn = yarnRaw
  }

  if (component.hook == null) {
    component.hook = legacyHook ? normalizeStringList(legacyHook) : []
  } else {
    component.hook = normalizeStringList(component.hook)
  }

  if (component.needle == null) {
    component.needle = legacyNeedle ? normalizeStringList(legacyNeedle) : []
  } else {
    component.needle = normalizeStringList(component.needle)
  }

  component.metadata.yarn = Array.isArray(component.yarn) ? component.yarn : []
  component.metadata.hook = uniqueList(normalizeStringList(component.metadata.hook))
  component.metadata.needle = uniqueList(normalizeStringList(component.metadata.needle))
}

export function getResolvedYarnLines(component, materials) {
  const baseYarnMeta = normalizeYarnMetaList(materials?.yarn)
  if (baseYarnMeta.length === 0) {
    const values = uniqueList(normalizeStringList(component?.yarn))
    if (values.length > 0) return values
    if (typeof component?.metadata?.yarn === 'string') return normalizeStringList(component.metadata.yarn)
    return uniqueList(normalizeStringList(component?.metadata?.yarn))
  }

  const raw = component?.yarn ?? component?.metadata?.yarn
  const selectedRaw = normalizeStringList(component?.yarn)
  const idMap = yarnMetaIdMap(baseYarnMeta)
  const unknownAsTypes = selectedRaw.filter((v) => !idMap.has(toText(v)))
  const effectiveYarnMeta = mergeYarnMetaWithTypes(baseYarnMeta, unknownAsTypes)
  return componentYarnDisplayLines(raw, effectiveYarnMeta)
}

export function getResolvedHookLines(component) {
  const values = uniqueList(normalizeStringList(component?.hook))
  if (values.length > 0) return values
  if (typeof component?.metadata?.hook === 'string') return normalizeStringList(component.metadata.hook)
  return uniqueList(normalizeStringList(component?.metadata?.hook))
}

export function getYarnOptions(component, materials) {
  const base = normalizeYarnMetaList(materials?.yarn)
  if (base.length === 0) return []

  const selectedRaw = normalizeStringList(component?.yarn)
  const idMap = yarnMetaIdMap(base)
  const unknownAsTypes = selectedRaw.filter((v) => !idMap.has(toText(v)))
  const effective = mergeYarnMetaWithTypes(base, unknownAsTypes)
  return yarnMetaOptions(effective)
}

export function getHookSuggestions(component, materials) {
  const fromProps = normalizeStringList(materials?.hook)
  const fromMeta = normalizeStringList(component?.metadata?.hook)
  const fromSelected = normalizeStringList(component?.hook)
  return mergeMaterialOptions(mergeMaterialOptions(fromProps, fromMeta), fromSelected)
}

export function hasMaterialOptions(component, materials) {
  return getYarnOptions(component, materials).length > 0 || getHookSuggestions(component, materials).length > 0
}
