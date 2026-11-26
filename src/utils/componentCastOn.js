import { CAST_ON_OTHER_INDEX, getCastOnByIndex, getCastOnDisplayName } from '@/constants/crochetData'
import { isComponentType } from '@/utils/componentTypes'

export function getComponentCastOnLabel(component, t) {
  if (!component || !isComponentType(component?.type)) return ''

  const rawType = component?.content?.type
  if (rawType === null || rawType === undefined || rawType === '') return ''

  const typeIndex = Number(rawType)
  if (!Number.isFinite(typeIndex)) return ''

  const castOn = getCastOnByIndex(typeIndex)
  return getCastOnDisplayName(castOn, t)
}

/**
 * Whether a component's rows are checked against the previous row's stitch count
 * (green / yellow / red 針數 cells, save-time warning). Not for cast-on 其他.
 */
export function shouldVerifyRowCounts(component) {
  return Number(component?.content?.type) !== CAST_ON_OTHER_INDEX
}
