import { BasicStitch } from '@/constants/crochetData.js'
import { calculateConsumeGenerateCore } from '@/utils/crochetStatsCore.js'

/**
 * Calculate the total consume and generate for crochet nodes.
 *
 * Supports:
 * - StitchNodeList arrays (row content)
 * - Single crochet nodes (stitch/bundle/pattern)
 *
 * @param {Array|object} input
 * @param {number} repeatCount
 * @returns {{consume:number, generate:number}}
 */
export const calculateConsumeGenerate = (input, repeatCount = 1) => {
  return calculateConsumeGenerateCore(input, repeatCount, BasicStitch)
}
