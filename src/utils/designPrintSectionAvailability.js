import { uniqueTrimmedStrings, toTrimmedText as toText } from '@/utils/text'
import { normalizeYarnMetaList } from '@/utils/yarnMeta'

function getProjectImages(project) {
  const raw = project?.images
  const list = Array.isArray(raw) ? raw : []
  return list
    .filter((x) => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean)
}

function getProjectDescription(project) {
  return String(project?.description || '').trim()
}

function getProjectMaterialsHookLines(project) {
  return uniqueTrimmedStrings(project?.materials?.hook)
}

function getProjectMaterialsYarnLines(project) {
  const meta = normalizeYarnMetaList(project?.materials?.yarn)
  return meta
    .map((m) => {
      const type = toText(m?.type)
      const amount = toText(m?.amount)
      if (!type) return ''
      return amount ? `${type}: ${amount}` : type
    })
    .filter(Boolean)
}

function getSelfDefinedStitchIntroductions(project) {
  const list = project?.self_defined_stitches
  if (!Array.isArray(list)) return []

  const out = []
  for (const stitch of list) {
    if (!stitch || typeof stitch !== 'object') continue
    const name = String(stitch.name || '').trim()
    const description = String(stitch.description || '').trim()
    if (!name || !description) continue
    out.push({ stitch_id: stitch.stitch_id, name, description })
  }

  return out.sort((a, b) => Number(a.stitch_id) - Number(b.stitch_id))
}

function getComponentNotes(component) {
  const notes = Array.isArray(component?.notes) ? component.notes : []
  return notes
    .map((n) => (typeof n === 'string' ? n : String(n?.description ?? '')))
    .map((n) => String(n ?? '').trim())
    .filter(Boolean)
}

function projectHasNotes(project) {
  const list = project?.component_list
  if (!Array.isArray(list)) return false
  return list.some((c) => getComponentNotes(c).length > 0)
}

/** Section keys that can appear in design print settings for this project. */
export function getAvailableDesignPrintSections(project) {
  if (!project || typeof project !== 'object') return []

  const keys = []
  if (getProjectImages(project).length > 0) keys.push('images')
  if (getProjectDescription(project)) keys.push('description')
  if (
    getProjectMaterialsHookLines(project).length > 0 ||
    getProjectMaterialsYarnLines(project).length > 0
  ) {
    keys.push('materials')
  }
  if (projectHasNotes(project)) keys.push('notes')
  if (getSelfDefinedStitchIntroductions(project).length > 0) keys.push('selfDefinedStitches')

  return keys
}

export function normalizeDesignSectionVisibilityForAvailable(visibility, availableKeys) {
  const allowed = new Set(Array.isArray(availableKeys) ? availableKeys : [])
  const out = {}

  for (const key of allowed) {
    out[key] = visibility?.[key] !== false
  }

  return out
}
