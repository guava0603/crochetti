import { BasicStitch } from '@/constants/crochetData.js'
import { calculateConsumeGenerateCore } from '@/utils/crochetStatsCore.js'

function normalizeSelfDefinedStitches(list) {
  return Array.isArray(list) ? list : []
}

function normalizeId(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Builds a stitch lookup that includes BasicStitch and optional self-defined stitches.
 *
 * The lookup format matches what `calculateConsumeGenerateCore` expects:
 * - index/key: stitch_id
 * - value: { consume, generate, symbol_jp, ... }
 */
export function buildStitchLookup(selfDefinedStitches) {
  const out = { ...BasicStitch }

  for (const s of normalizeSelfDefinedStitches(selfDefinedStitches)) {
    if (!s || typeof s !== 'object') continue
    const id = normalizeId(s.stitch_id)
    if (id === null) continue

    const name = String(s.name || '').trim()
    const description = String(s.description || '').trim()
    const consume = Number(s.consume)
    const generate = Number(s.generate)

    out[id] = {
      index: id,
      name,
      description,
      // Always display the raw name (not translated) by putting it in symbol_jp.
      symbol_jp: name,
      consume: Number.isFinite(consume) ? consume : 1,
      generate: Number.isFinite(generate) ? generate : 0
    }
  }

  return out
}

/**
 * Calculate the total consume and generate for crochet nodes.
 *
 * Supports:
 * - StitchNodeList arrays (row content)
 * - Single crochet nodes (stitch/bundle/pattern)
 *
 * @param {Array|object} input
 * @param {number} repeatCount
 * @param {Array|object|null} selfDefinedStitches
 * @returns {{consume:number, generate:number}}
 */
export function calculateConsumeGenerate(input, repeatCount = 1, selfDefinedStitches = null) {
  if (!selfDefinedStitches) return calculateConsumeGenerateCore(input, repeatCount, BasicStitch)
  const lookup = buildStitchLookup(selfDefinedStitches)
  return calculateConsumeGenerateCore(input, repeatCount, lookup)
}
