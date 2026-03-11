import { getBaseStitchIdFromNameKey, getStitchGroup } from '@/constants/crochetData'

const KNOWN_ICON_FILES = new Set([
  'bp-doubleCrochet.PNG',
  'bp-halfDoubleCrochet.PNG',
  'bp-singleCrochet.PNG',
  'bp-trebleCrochet.PNG',
  'chain.PNG',
  'decrease-doubleCrochet.PNG',
  'decrease-halfDoubleCrochet.PNG',
  'doubleCrochet.PNG',
  'doubleTrebleCrochet.PNG',
  'fp-doubleCrochet.PNG',
  'fp-halfDoubleCrochet.PNG',
  'fp-singleCrochet.PNG',
  'fp-trebleCrochet.PNG',
  'halfDoubleCrochet.PNG',
  'increase-doubleCrochet.PNG',
  'increase-halfDoubleCrochet.PNG',
  'increase-singleCrochet.PNG',
  'singleCrochet.PNG',
  'slipStitch.PNG',
  'trebleCrochet.PNG'
])

const normalizePosition = (position) => {
  if (typeof position !== 'string') return ''
  return position.trim().toUpperCase()
}

export function getCrochetIconUrl({ stitch, position }) {
  if (!stitch || typeof stitch !== 'object') return ''

  const baseId = getBaseStitchIdFromNameKey(stitch?.nameKey)
  if (!baseId) return ''

  const group = getStitchGroup(stitch)
  const pos = normalizePosition(position)

  let fileName = ''

  // Post stitches (FP/BP) only have dedicated icons for base stitches.
  if (group === 'general' && (pos === 'FP' || pos === 'BP')) {
    fileName = `${pos.toLowerCase()}-${baseId}.PNG`
  } else if (group === 'increase') {
    fileName = `increase-${baseId}.PNG`
  } else if (group === 'decrease') {
    fileName = `decrease-${baseId}.PNG`
  } else {
    fileName = `${baseId}.PNG`
  }

  if (!KNOWN_ICON_FILES.has(fileName)) return ''

  const base = import.meta.env.BASE_URL || '/'
  return `${base}assets/image/crochet/${fileName}`
}
