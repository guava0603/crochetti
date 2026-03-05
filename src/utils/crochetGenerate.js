import { BasicStitch } from '@/constants/crochetData.js'
import { buildStitchLookup } from '@/utils/calculateConsumeGenerate.js'

const shouldUseSelfDefined = (selfDefinedStitches) =>
  Array.isArray(selfDefinedStitches) && selfDefinedStitches.length > 0

function getLookup(selfDefinedStitches) {
  return shouldUseSelfDefined(selfDefinedStitches) ? buildStitchLookup(selfDefinedStitches) : BasicStitch
}

export function getStitchGenerate(node, selfDefinedStitches) {
  if (!node) return 0
  const lookup = getLookup(selfDefinedStitches)
  return lookup?.[node.stitch_id]?.generate || 0
}

export function getPatternRepeatGenerate(pattern = [], selfDefinedStitches) {
  if (!Array.isArray(pattern) || pattern.length === 0) return 0
  return pattern.reduce((sum, item) => sum + getNodeTotalGenerate(item, selfDefinedStitches), 0)
}

export function getBundleRepeatGenerate(bundle = [], selfDefinedStitches) {
  if (!Array.isArray(bundle) || bundle.length === 0) return 0
  return bundle.reduce((sum, item) => sum + getNodeTotalGenerate(item, selfDefinedStitches), 0)
}

// Per-repeat generate for a node (does NOT multiply by node.count)
export function getNodePerRepeatGenerate(node, selfDefinedStitches) {
  if (!node) return 0

  if (node.type === 'stitch') {
    return getStitchGenerate(node, selfDefinedStitches)
  }

  if (node.type === 'pattern') {
    return getPatternRepeatGenerate(node.pattern || [], selfDefinedStitches)
  }

  if (node.type === 'bundle') {
    // Prefer computed inner generate when available; fallback to persisted `node.generate`.
    const computedPer = getBundleRepeatGenerate(node.bundle || [], selfDefinedStitches)
    if (computedPer > 0) return computedPer
    return Number(node.generate || 0)
  }

  return Number(node.generate || 0)
}

// Total generate for a node (multiplies per-repeat by node.count)
export function getNodeTotalGenerate(node, selfDefinedStitches) {
  if (!node) return 0
  const count = Math.max(1, Number(node.count || 1))
  return getNodePerRepeatGenerate(node, selfDefinedStitches) * count
}

export function isStitchNode(node) {
  if (node?.type === 'stitch') return true
  if (node?.type === 'pattern' && Array.isArray(node.pattern)) {
    if (node.pattern.length === 1 && node.pattern[0]?.type === 'stitch') return true
  }
  return false
}
