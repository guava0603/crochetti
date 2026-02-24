// Utilities for editing pattern node content (the inner `pattern` array).

import { BasicStitch, createBundle, getVariantStitchId } from '@/constants/crochetData'
import { calculateConsumeGenerate } from '@/utils/calculateConsumeGenerate.js'

/**
 * Append a stitch into a pattern list.
 *
 * The pattern list is an array of "anchors" (stitch/bundle/pattern nodes).
 * We keep the list flat and prefer `type: 'stitch'` entries with an optional `count`.
 *
 * Behavior:
 * - If the last anchor is the same stitch, increment its `count`.
 * - Otherwise, append a new stitch anchor.
 * - Also supports a legacy representation where the last anchor is a `pattern`
 *   node wrapping a single stitch.
 */
export function addStitchToPatternList(patternList, stitchOrPayload) {
  const list = Array.isArray(patternList) ? [...patternList] : []

  const stitchId = typeof stitchOrPayload === 'number' ? stitchOrPayload : stitchOrPayload?.stitchId
  const mode = typeof stitchOrPayload === 'object' && stitchOrPayload?.mode ? stitchOrPayload.mode : 'normal'
  if (stitchId === null || stitchId === undefined) return list

  if (mode === 'same-stitch') {
    const stitch = BasicStitch?.[stitchId]
    const stitchGenerate = stitch?.generate || 0

    const lastIndex = list.length - 1
    const lastNode = lastIndex >= 0 ? list[lastIndex] : null

    // Desired shape: pattern{ bundle(consume=1){ stitch, stitch, ... } }
    // Unwrap legacy shapes like pattern{ bundle } or pattern{ pattern{ bundle } }.
    const unwrapLegacySameStitchBundle = (node) => {
      if (!node) return null

      if (node.type === 'bundle' && (node.consume || 1) === 1 && Array.isArray(node.bundle)) {
        return node
      }

      if (node.type !== 'pattern' || (node.count || 1) !== 1 || !Array.isArray(node.pattern) || node.pattern.length !== 1) {
        return null
      }

      const only = node.pattern[0]
      if (only?.type === 'bundle' && (only.consume || 1) === 1 && Array.isArray(only.bundle)) {
        return only
      }

      if (
        only?.type === 'pattern' &&
        (only.count || 1) === 1 &&
        Array.isArray(only.pattern) &&
        only.pattern.length === 1 &&
        only.pattern[0]?.type === 'bundle' &&
        (only.pattern[0]?.consume || 1) === 1 &&
        Array.isArray(only.pattern[0]?.bundle)
      ) {
        return only.pattern[0]
      }

      return null
    }

    const legacyBundle = unwrapLegacySameStitchBundle(lastNode)
    if (legacyBundle && lastNode?.type !== 'bundle') {
      list.splice(lastIndex, 1, legacyBundle)
    }

    const targetNode = list.length > 0 ? list[list.length - 1] : null
    if (targetNode && targetNode.type === 'bundle' && (targetNode.consume || 1) === 1 && Array.isArray(targetNode.bundle)) {
      targetNode.bundle.push({ type: 'stitch', stitch_id: stitchId })
      targetNode.generate = (targetNode.generate || 0) + stitchGenerate
      targetNode.consume = 1
      if (targetNode.count === undefined) targetNode.count = 1
      return list
    }

    list.push({
      type: 'bundle',
      bundle: [{ type: 'stitch', stitch_id: stitchId }],
      consume: 1,
      generate: stitchGenerate,
      count: 1
    })
    return list
  }

  if (list.length > 0) {
    const lastIndex = list.length - 1
    const last = list[lastIndex]

    if (last?.type === 'stitch' && last.stitch_id === stitchId) {
      // Upgrade a plain stitch anchor into a compact pattern wrapper.
      const nextCount = (last.count || 1) + 1
      list[lastIndex] = {
        type: 'pattern',
        pattern: [{ type: 'stitch', stitch_id: stitchId }],
        count: nextCount
      }
      return list
    }

    // Legacy: pattern{ [stitch] } count=N used as a compact stitch anchor.
    if (
      last?.type === 'pattern' &&
      Array.isArray(last.pattern) &&
      last.pattern.length === 1 &&
      last.pattern[0]?.type === 'stitch' &&
      last.pattern[0]?.stitch_id === stitchId
    ) {
      const nextCount = (last.count || 1) + 1
      list[lastIndex] = { ...last, count: nextCount }
      return list
    }
  }

  list.push({ type: 'stitch', stitch_id: stitchId })
  return list
}

/**
 * Apply an increase/decrease adjustment to the *last stitch* of a pattern list.
 *
 * Rules (as requested):
 * - Only works when the last anchor is not a bundle.
 * - If the last anchor is a pattern, split out the last stitch first.
 * - Increase:
 *   - If last stitch matches selected base (X/T/F), replace it with V/TV/FV.
 *   - Otherwise replace the last stitch with a bundle of 2 stitches (consume=1).
 * - Decrease:
 *   - Only valid when last stitch is X/T/F and selected base matches it.
 *   - Replace it with A/TA/FA.
 */
export function applyAdjustToPatternList(patternList, { variant, stitchId }) {
  const list = Array.isArray(patternList) ? [...patternList] : []
  const safeVariant = variant === 'decrease' ? 'decrease' : 'increase'
  const baseStitchId = typeof stitchId === 'number' ? stitchId : null
  if (baseStitchId === null) return list
  if (list.length === 0) return list

  const splitOutLastStitchIfNeeded = () => {
    const lastIndex = list.length - 1
    const lastNode = list[lastIndex]
    if (!lastNode) return null
    if (lastNode.type === 'bundle') return null
    if (lastNode.type !== 'pattern') return { targetIndex: lastIndex }

    const repeat = lastNode.count || 1
    const inner = Array.isArray(lastNode.pattern) ? lastNode.pattern : []
    if (inner.length === 0) return null

    // Compact wrapper: [stitch] * n
    if (inner.length === 1 && inner[0]?.type === 'stitch' && repeat > 1) {
      const stitch = { ...inner[0] }
      const nextPattern = {
        ...lastNode,
        pattern: [{ ...stitch }],
        count: repeat - 1
      }
      const stats = calculateConsumeGenerate(nextPattern.pattern, nextPattern.count)
      nextPattern.consume = stats.consume
      nextPattern.generate = stats.generate

      list.splice(lastIndex, 1, nextPattern, { type: 'stitch', stitch_id: stitch.stitch_id })
      return { targetIndex: lastIndex + 1 }
    }

    // Single repeat: pop last stitch out.
    if (repeat === 1) {
      const lastAnchor = inner[inner.length - 1]
      if (!lastAnchor || lastAnchor.type !== 'stitch') return null

      const remaining = inner.slice(0, -1).map((n) => ({ ...n }))
      if (remaining.length === 0) {
        list.splice(lastIndex, 1, { type: 'stitch', stitch_id: lastAnchor.stitch_id })
        return { targetIndex: lastIndex }
      }

      const nextPattern = {
        ...lastNode,
        pattern: remaining,
        count: 1
      }
      const stats = calculateConsumeGenerate(nextPattern.pattern, nextPattern.count)
      nextPattern.consume = stats.consume
      nextPattern.generate = stats.generate

      list.splice(lastIndex, 1, nextPattern, { type: 'stitch', stitch_id: lastAnchor.stitch_id })
      return { targetIndex: lastIndex + 1 }
    }

    return null
  }

  const split = splitOutLastStitchIfNeeded()
  if (!split) return list

  const targetIndex = split.targetIndex
  const targetNode = list[targetIndex]
  if (!targetNode || targetNode.type !== 'stitch') return list

  if (safeVariant === 'decrease') {
    if (targetNode.stitch_id !== baseStitchId) return list
    const variantId = getVariantStitchId(baseStitchId, 'decrease')
    if (variantId === null) return list
    targetNode.stitch_id = variantId
    return list
  }

  // increase
  if (targetNode.stitch_id === baseStitchId) {
    const variantId = getVariantStitchId(baseStitchId, 'increase')
    if (variantId === null) return list
    targetNode.stitch_id = variantId
    return list
  }

  const originalId = targetNode.stitch_id
  const originalStitch = BasicStitch?.[originalId]
  const addedStitch = BasicStitch?.[baseStitchId]
  if (!originalStitch || !addedStitch) return list

  const bundle = createBundle(
    [
      { type: 'stitch', stitch_id: originalId },
      { type: 'stitch', stitch_id: baseStitchId }
    ],
    1,
    1
  )

  list.splice(targetIndex, 1, bundle)
  return list
}
