import { BasicStitch } from '@/constants/crochetData.js'
import { buildStitchLookup } from '@/utils/calculateConsumeGenerate.js'
import { getRopeChainCount } from '@/utils/ropeChainCount'
import {
  getNodeSize as getNodeSizeShared,
  computeGenerateDoneWithLookup,
  endAtToSelectionListWithLookup
} from '@/utils/stitchSelectionPosition'

const shouldUseSelfDefined = (selfDefinedStitches) =>
  Array.isArray(selfDefinedStitches) && selfDefinedStitches.length > 0

const getLookup = (selfDefinedStitches) =>
  shouldUseSelfDefined(selfDefinedStitches) ? buildStitchLookup(selfDefinedStitches) : BasicStitch

export const getNodeSize = (node) => {
  // Keep compatibility: rope size comes from chain_count.
  if (node?.type === 'rope') return getRopeChainCount(node)
  return getNodeSizeShared(node)
}

// Compute how many stitches have been generated within a row, based on a nested selection path.
// This is used for converting selection UI -> end_at.crochet_count.
export const computeGenerateDone = (selectionList, stitchList, counts, selfDefinedStitches) => {
  const lookup = getLookup(selfDefinedStitches)
  return computeGenerateDoneWithLookup(selectionList, stitchList, counts, lookup)
}

// Convert end_at.crochet_count to a nested selection path within a row.
// Used for applying selection highlight to RecordingTable based on persisted end_at.
export function endAtToSelectionList(row, endAt, selfDefinedStitches) {
  const lookup = getLookup(selfDefinedStitches)
  return endAtToSelectionListWithLookup(row, endAt, lookup)
}
