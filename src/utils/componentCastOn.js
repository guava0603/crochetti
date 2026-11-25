import { getCastOnByIndex, getCastOnDisplayName } from '@/constants/crochetData'
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
