import { getRopeChainCount } from '@/utils/ropeChainCount'

export function getStitchGenerate(node, stitchLookup) {
  if (!node) return 0
  const meta = stitchLookup && stitchLookup[node.stitch_id]
  return Number((meta && meta.generate) || 0)
}

export function getPatternRepeatGenerate(pattern = [], stitchLookup) {
  if (!Array.isArray(pattern) || pattern.length === 0) return 0
  return pattern.reduce((sum, item) => sum + getNodeTotalGenerate(item, stitchLookup), 0)
}

export function getBundleRepeatGenerate(bundle = [], stitchLookup) {
  if (!Array.isArray(bundle) || bundle.length === 0) return 0
  return bundle.reduce((sum, item) => sum + getNodeTotalGenerate(item, stitchLookup), 0)
}

// Per-repeat generate for a node (does NOT multiply by node.count)
export function getNodePerRepeatGenerate(node, stitchLookup) {
  if (!node) return 0

  if (node.type === 'stitch') {
    return getStitchGenerate(node, stitchLookup)
  }

  if (node.type === 'rope') {
    return getRopeChainCount(node)
  }

  if (node.type === 'pattern') {
    return getPatternRepeatGenerate(node.pattern || [], stitchLookup)
  }

  if (node.type === 'bundle') {
    const computedPer = getBundleRepeatGenerate(node.bundle || [], stitchLookup)
    if (computedPer > 0) return computedPer
    return Number(node.generate || 0)
  }

  return Number(node.generate || 0)
}

// Total generate for a node (multiplies per-repeat by node.count)
export function getNodeTotalGenerate(node, stitchLookup) {
  if (!node) return 0
  const count = Math.max(1, Number(node.count || 1))
  return getNodePerRepeatGenerate(node, stitchLookup) * count
}
