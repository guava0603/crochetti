import { BasicStitch } from '@/constants/crochetData.js'
import { buildStitchLookup } from '@/utils/calculateConsumeGenerate.js'
import {
  getStitchGenerate as getStitchGenerateCore,
  getPatternRepeatGenerate as getPatternRepeatGenerateCore,
  getBundleRepeatGenerate as getBundleRepeatGenerateCore,
  getNodePerRepeatGenerate as getNodePerRepeatGenerateCore,
  getNodeTotalGenerate as getNodeTotalGenerateCore
} from '@/utils/nodeGenerate'

const shouldUseSelfDefined = (selfDefinedStitches) =>
  Array.isArray(selfDefinedStitches) && selfDefinedStitches.length > 0

function getLookup(selfDefinedStitches) {
  return shouldUseSelfDefined(selfDefinedStitches) ? buildStitchLookup(selfDefinedStitches) : BasicStitch
}

export function getStitchGenerate(node, selfDefinedStitches) {
  if (!node) return 0
  const lookup = getLookup(selfDefinedStitches)
  return getStitchGenerateCore(node, lookup)
}

export function getPatternRepeatGenerate(pattern = [], selfDefinedStitches) {
  const lookup = getLookup(selfDefinedStitches)
  return getPatternRepeatGenerateCore(pattern, lookup)
}

export function getBundleRepeatGenerate(bundle = [], selfDefinedStitches) {
  const lookup = getLookup(selfDefinedStitches)
  return getBundleRepeatGenerateCore(bundle, lookup)
}

// Per-repeat generate for a node (does NOT multiply by node.count)
export function getNodePerRepeatGenerate(node, selfDefinedStitches) {
  const lookup = getLookup(selfDefinedStitches)
  return getNodePerRepeatGenerateCore(node, lookup)
}

// Total generate for a node (multiplies per-repeat by node.count)
export function getNodeTotalGenerate(node, selfDefinedStitches) {
  const lookup = getLookup(selfDefinedStitches)
  return getNodeTotalGenerateCore(node, lookup)
}

export function isStitchNode(node) {
  if (node?.type === 'stitch') return true
  if (node?.type === 'pattern' && Array.isArray(node.pattern)) {
    if (node.pattern.length === 1 && node.pattern[0]?.type === 'stitch') return true
  }
  return false
}
