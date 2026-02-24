const isCrochetNode = (value) => {
  return !!value && typeof value === 'object' && typeof value.type === 'string'
}

const safeRepeat = (repeatCount) => (Number.isFinite(repeatCount) && repeatCount > 0 ? repeatCount : 1)

/**
 * Core consume/generate calculation that does NOT import any constants.
 * Callers provide a stitch lookup table (e.g. `BasicStitch`) so this stays dependency-free.
 *
 * @param {Array|object} input
 * @param {number} repeatCount
 * @param {Array|Object} basicStitchLookup
 * @returns {{consume:number, generate:number}}
 */
export const calculateConsumeGenerateCore = (input, repeatCount = 1, basicStitchLookup) => {
  const lookup = basicStitchLookup

  const calcList = (stitchNodeList, listRepeat = 1) => {
    const safeList = Array.isArray(stitchNodeList) ? stitchNodeList : []
    const rep = safeRepeat(listRepeat)

    let totalConsume = 0
    let totalGenerate = 0

    safeList.forEach((node) => {
      if (!isCrochetNode(node)) return

      if (node.type === 'stitch') {
        const stitch = lookup?.[node.stitch_id]
        if (!stitch) return

        const count = node.count || 1
        totalConsume += (stitch.consume || 0) * count
        totalGenerate += (stitch.generate || 0) * count
        return
      }

      if (node.type === 'bundle') {
        const count = node.count || 1
        totalConsume += (node.consume || 1) * count
        totalGenerate += (node.generate || 0) * count
        return
      }

      if (node.type === 'pattern') {
        const nested = calcList(node.pattern || [], node.count || 1)
        totalConsume += nested.consume
        totalGenerate += nested.generate
      }
    })

    return { consume: totalConsume * rep, generate: totalGenerate * rep }
  }

  if (Array.isArray(input)) {
    return calcList(input, repeatCount)
  }

  if (!isCrochetNode(input)) {
    return { consume: 0, generate: 0 }
  }

  if (input.type === 'stitch' || input.type === 'bundle') {
    return calcList([input], repeatCount)
  }

  if (input.type === 'pattern') {
    const inner = calcList(input.pattern || [], input.count || 1)
    const rep = safeRepeat(repeatCount)
    return { consume: inner.consume * rep, generate: inner.generate * rep }
  }

  return { consume: 0, generate: 0 }
}
