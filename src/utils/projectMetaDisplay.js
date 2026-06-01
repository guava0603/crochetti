import { uniqueTrimmedStrings, toTrimmedText as toText } from '@/utils/text'
import { normalizeYarnMetaList } from '@/utils/yarnMeta'

export function getProjectMaterialsHookLines(materials) {
  return uniqueTrimmedStrings(materials?.hook)
}

export function getProjectMaterialsYarnLines(materials) {
  const meta = normalizeYarnMetaList(materials?.yarn)
  return meta
    .map((m) => {
      const type = toText(m?.type)
      const amount = toText(m?.amount)
      if (!type) return ''
      return amount ? `${type}: ${amount}` : type
    })
    .filter(Boolean)
}

export function getSelfDefinedStitchIntroductions(stitches) {
  const list = stitches
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
