// Utilities for validating/normalizing crochet data structures.

import { getVariantStitchId } from '@/constants/crochetData'

const getRepeatedStitchInfo = (node) => {
  if (!node || typeof node !== 'object') return null

  if (node.type === 'stitch') {
    const stitchId = typeof node.stitch_id === 'number' ? node.stitch_id : null
    if (stitchId === null) return null
    const count = Number(node.count || 1)
    return { stitchId, count: Number.isFinite(count) && count > 0 ? count : 1 }
  }

  if (node.type === 'pattern') {
    const inner = Array.isArray(node.pattern) ? node.pattern : []
    if (inner.length !== 1) return null
    const only = inner[0]
    if (!only || only.type !== 'stitch' || typeof only.stitch_id !== 'number') return null

    const repeat = Number(node.count || 1)
    const repeatSafe = Number.isFinite(repeat) && repeat > 0 ? repeat : 1
    const innerCount = Number(only.count || 1)
    const innerCountSafe = Number.isFinite(innerCount) && innerCount > 0 ? innerCount : 1

    return { stitchId: only.stitch_id, count: repeatSafe * innerCountSafe }
  }

  return null
}

const collapseConsecutiveSameStitchesToPattern = (list) => {
  const safe = Array.isArray(list) ? list : []
  if (safe.length <= 1) return safe

  const out = []
  for (const node of safe) {
    const info = getRepeatedStitchInfo(node)
    if (!info) {
      out.push(node)
      continue
    }

    const last = out.length > 0 ? out[out.length - 1] : null
    const lastInfo = getRepeatedStitchInfo(last)
    if (!lastInfo || lastInfo.stitchId !== info.stitchId) {
      out.push(node)
      continue
    }

    // Merge into a compact pattern wrapper.
    const nextCount = lastInfo.count + info.count
    out[out.length - 1] = {
      type: 'pattern',
      pattern: [{ type: 'stitch', stitch_id: info.stitchId }],
      count: nextCount
    }
  }

  return out
}

/**
 * Normalize a single crochet node.
 *
 * Currently implemented rules:
 * 1) For nested patterns, if there are continuous 2 pattern nodes with only 1 item,
 *    collapse them into 1 pattern with count = product of the 2 counts.
 *
 * Example:
 * pattern(count=a){ pattern(count=b){ X } } -> pattern(count=a*b){ X }
 */
function normalizeNode(node) {
  if (!node || typeof node !== 'object') return node

  if (node.type === 'bundle') {
    const bundle = Array.isArray(node.bundle) ? node.bundle : []
    const nextBundle = collapseConsecutiveSameStitchesToPattern(bundle.map(normalizeNode))

    // Rule: bundle of two identical stitches in the same stitch
    // e.g. [X, X] -> V, [T, T] -> TV, [F, F] -> FV, [E, E] -> EV
    // Only apply for consume=1 and count=1 (single bundle execution).
    const consume = Number(node.consume || 1)
    const count = Number(node.count || 1)
    if (consume === 1 && count === 1 && nextBundle.length === 2) {
      const [a, b] = nextBundle
      const baseIds = [4, 7, 10, 13] // X, T, F, E
      if (
        a?.type === 'stitch' &&
        b?.type === 'stitch' &&
        a.stitch_id === b.stitch_id &&
        baseIds.includes(a.stitch_id)
      ) {
        const variantId = getVariantStitchId(a.stitch_id, 'increase')
        if (variantId !== null && variantId !== undefined) {
          return { type: 'stitch', stitch_id: variantId }
        }
      }
    }

    return nextBundle === bundle ? node : { ...node, bundle: nextBundle }
  }

  if (node.type !== 'pattern') {
    return node
  }

  const countA = Number(node.count || 1)
  const patternA = Array.isArray(node.pattern) ? node.pattern : []

  // Normalize children first.
  let nextPattern = collapseConsecutiveSameStitchesToPattern(patternA.map(normalizeNode))

  // Merge consecutive single-item pattern wrappers.
  // Keep folding while the direct child is also a single-item pattern.
  let nextCount = countA
  while (
    Array.isArray(nextPattern) &&
    nextPattern.length === 1 &&
    nextPattern[0] &&
    nextPattern[0].type === 'pattern'
  ) {
    const child = nextPattern[0]
    const childPattern = Array.isArray(child.pattern) ? child.pattern : []
    if (childPattern.length !== 1) break

    const countB = Number(child.count || 1)
    nextCount *= countB
    nextPattern = collapseConsecutiveSameStitchesToPattern(childPattern.map(normalizeNode))
  }

  // After folding wrappers, collapse consecutive identical stitches again.
  nextPattern = collapseConsecutiveSameStitchesToPattern(nextPattern)

  return {
    ...node,
    count: nextCount,
    pattern: nextPattern
  }
}

function isCrochetNode(value) {
  if (!value || typeof value !== 'object') return false
  const t = value.type
  return t === 'stitch' || t === 'pattern' || t === 'bundle'
}

function normalizeNodeList(list) {
  const safe = Array.isArray(list) ? list : []
  return safe.map(normalizeNode)
}

/**
 * Validate/normalize a crochet object.
 *
 * Supported inputs:
 * - A stitch node list array
 * - A row content object: { stitch_node_list, consume, generate, ... }
 * - Any object that contains nested crochet nodes/patterns/bundles
 */
export function crochetValidate(crochet) {
  if (Array.isArray(crochet)) {
    const safe = crochet
    // If it's a node list, normalize it.
    if (safe.every(isCrochetNode)) {
      return normalizeNodeList(safe)
    }

    // Otherwise, it could be a list of rows/components/etc.
    // Deep-walk each entry without treating the array as stitch nodes.
    return safe.map(item => crochetValidate(item))
  }

  if (isCrochetNode(crochet)) {
    return normalizeNode(crochet)
  }

  if (!crochet || typeof crochet !== 'object') {
    return crochet
  }

  // Common shape: row content
  if (Array.isArray(crochet.stitch_node_list)) {
    return {
      ...crochet,
      stitch_node_list: normalizeNodeList(crochet.stitch_node_list)
    }
  }

  // Generic deep walk: only rewrite known crochet-ish subtrees.
  const next = Array.isArray(crochet) ? [] : {}
  for (const [key, value] of Object.entries(crochet)) {
    if (key === 'stitch_node_list' && Array.isArray(value)) {
      next[key] = normalizeNodeList(value)
      continue
    }

    if (Array.isArray(value) && value.every(isCrochetNode)) {
      next[key] = normalizeNodeList(value)
      continue
    }

    if (isCrochetNode(value)) {
      next[key] = normalizeNode(value)
      continue
    }

    if (value && typeof value === 'object') {
      next[key] = crochetValidate(value)
      continue
    }

    next[key] = value
  }

  return next
}
