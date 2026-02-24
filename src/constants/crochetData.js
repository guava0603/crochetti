// Fixed data structures for crochet terminology and techniques

import { calculateConsumeGenerateCore } from '@/utils/crochetStatsCore.js'

/**
 * 定義每一針或每一組的基礎結構
 * type SingleAnchor = SimpleStitch | Bundle | Pattern;
 * type StitchNode = Pattern;
 *
 * SimpleStitch: {
 *   type: "stitch",
 *   stitch_id: number,     // 針法 ID (use BasicStitch[stitch_id] to get details)
 * }
 *
 * Bundle: {
 *   type: "bundle",
 *   bundle: SimpleStitch[],   // 束內容，只能包含 SimpleStitch
 *   consume: number,          // 消耗針數 (default: 1)
 *   generate: number,         // 產生針數 (從 bundle 計算得出)
 *   count: number,            // 數量 (default: 1)
 *   label?: string            // 選填：給這個束一個名字
 * }
 *
 * Pattern: {
 *   type: "pattern",
 *   pattern: SingleAnchor[],  // 模式內容，包含 SimpleStitch、Bundle 或 Pattern
 *   count: number,            // 重複次數，例如 [2sc, inc] * 6 中的 6
 *   consume: number,          // 總消耗針數 (從 pattern 計算得出)
 *   generate: number,         // 總產生針數 (從 pattern 計算得出)
 *   label?: string            // 選填：給這個模式一個名字（如：爆米花針組）
 * }
 *
 * Row: {
 *   row_index: number,        // 實際的起始行號 (e.g., 1, 2, 5, 11...)
 *                             // 當 count 改變時，所有後續行的 row_index 會自動重新計算
 *   count: number,     // 重複次數，例如該行重複 3 次
 *   content: {
 *     stitch_node_list: Pattern[],  // 可包含 Pattern 或 SimpleStitch
 *     generate: number,                 // 總產生針數 (由 CrochetDisplay 計算)
 *     consume: number                   // 總消耗針數 (由 CrochetDisplay 計算)
 *   }
 * }
 **/

export const BasicStitch = [
  {
    index: 0,
    nameKey: 'crochet.stitches.slipStitch',
    symbol_jp: 'sl',
    consume: 1,
    generate: 1
  },
  {
    index: 1,
    nameKey: 'crochet.stitches.chain',
    symbol_jp: 'ch',
    consume: 0,
    generate: 1
  },
  {
    index: 2,
    nameKey: 'crochet.stitches.turningChain',
    symbol_jp: 'ch',
    consume: 0,
    generate: 0
  },
  {
    index: 3,
    nameKey: 'crochet.stitches.skip',
    symbol_jp: 'skip',
    consume: 1,
    generate: 0
  },
  {
    index: 4,
    nameKey: 'crochet.stitches.singleCrochet',
    symbol_jp: 'X',
    consume: 1,
    generate: 1
  },
  {
    index: 5,
    nameKey: 'crochet.stitches.increase.singleCrochet',
    symbol_jp: 'V',
    consume: 1,
    generate: 2
  },
  {
    index: 6,
    nameKey: 'crochet.stitches.decrease.singleCrochet',
    symbol_jp: 'A',
    consume: 2,
    generate: 1
  },
  {
    index: 7,
    nameKey: 'crochet.stitches.halfDoubleCrochet',
    symbol_jp: 'T',
    consume: 1,
    generate: 1
  },
  {
    index: 8,
    nameKey: 'crochet.stitches.increase.halfDoubleCrochet',
    symbol_jp: 'TV',
    consume: 1,
    generate: 2
  },
  {
    index: 9,
    nameKey: 'crochet.stitches.decrease.halfDoubleCrochet',
    symbol_jp: 'TA',
    consume: 2,
    generate: 1
  },
  {
    index: 10,
    nameKey: 'crochet.stitches.doubleCrochet',
    symbol_jp: 'F',
    consume: 1,
    generate: 1
  },
  {
    index: 11,
    nameKey: 'crochet.stitches.increase.doubleCrochet',
    symbol_jp: 'FV',
    consume: 1,
    generate: 2
  },
  {
    index: 12,
    nameKey: 'crochet.stitches.decrease.doubleCrochet',
    symbol_jp: 'FA',
    consume: 2,
    generate: 1
  },
  {
    index: 13,
    nameKey: 'crochet.stitches.trebleCrochet',
    symbol_jp: 'E',
    consume: 1,
    generate: 1
  },
  {
    index: 14,
    nameKey: 'crochet.stitches.increase.trebleCrochet',
    symbol_jp: 'EV',
    consume: 1,
    generate: 2
  },
  {
    index: 15,
    nameKey: 'crochet.stitches.decrease.trebleCrochet',
    symbol_jp: 'EA',
    consume: 2,
    generate: 1
  },
  {
    index: 16,
    nameKey: 'crochet.stitches.frontPostDoubleCrochet',
    symbol_jp: 'OF',
    consume: 1,
    generate: 1
  },
  {
    index: 17,
    nameKey: 'crochet.stitches.frontPostHalfDoubleCrochet',
    symbol_jp: 'OM',
    consume: 1,
    generate: 1
  }
]

const STITCH_KEY_PREFIX = 'crochet.stitches.'
const STITCH_VARIANT_REGEX = /^crochet\.stitches\.(increase|decrease)\.(.+)$/

export const getBaseStitchNameKey = (nameKey) => {
  if (typeof nameKey !== 'string') return nameKey
  const match = nameKey.match(STITCH_VARIANT_REGEX)
  if (!match) return nameKey
  return `${STITCH_KEY_PREFIX}${match[2]}`
}

export const getBaseStitchIdFromNameKey = (nameKey) => {
  if (typeof nameKey !== 'string') return null
  const variantMatch = nameKey.match(STITCH_VARIANT_REGEX)
  if (variantMatch) return variantMatch[2]
  if (nameKey.startsWith(STITCH_KEY_PREFIX)) return nameKey.slice(STITCH_KEY_PREFIX.length)
  return null
}

export const getStitchGroup = (stitch) => {
  const nameKey = stitch?.nameKey
  if (typeof nameKey === 'string') {
    const match = nameKey.match(STITCH_VARIANT_REGEX)
    if (match?.[1] === 'increase') return 'increase'
    if (match?.[1] === 'decrease') return 'decrease'
  }
  return 'general'
}

export const BasicStitchGeneral = BasicStitch.filter((s) => getStitchGroup(s) === 'general')
export const BasicStitchIncrease = BasicStitch.filter((s) => getStitchGroup(s) === 'increase')
export const BasicStitchDecrease = BasicStitch.filter((s) => getStitchGroup(s) === 'decrease')

// Get increase/decrease variant stitch index for a given stitch_id.
// - If the selected stitch is already an increase/decrease, we first resolve its base stitch.
// - Returns null if no variant exists.
export const getVariantStitchId = (stitchId, variant) => {
  const stitch = BasicStitch[stitchId]
  if (!stitch || !stitch.nameKey) return null

  const baseId = getBaseStitchIdFromNameKey(stitch.nameKey)
  if (!baseId) return null
  const safeVariant = variant === 'decrease' ? 'decrease' : 'increase'
  const variantKey = `${STITCH_KEY_PREFIX}${safeVariant}.${baseId}`
  const match = BasicStitch.find((s) => s?.nameKey === variantKey)
  return match ? match.index : null
}

export const CastOn = [
  {
    index: 0,
    nameKey: 'crochet.castOn.magicRing'
  },
  {
    index: 1,
    nameKey: 'crochet.castOn.chainRing'
  },
  {
    index: 2,
    nameKey: 'crochet.castOn.flat'
  },
  {
    index: 3,
    nameKey: 'crochet.castOn.oval'
  }
]

// Localized display helpers (keep data pure; callers provide `t` from vue-i18n)
export const getStitchDisplayName = (stitch, t) => {
  if (!stitch) return ''
  if (typeof t === 'function' && stitch.nameKey) {
    const value = t(stitch.nameKey)
    if (value && value !== stitch.nameKey) return value
  }
  return ''
}

export const getCastOnDisplayName = (castOn, t) => {
  if (!castOn) return ''
  if (typeof t === 'function' && castOn.nameKey) {
    const value = t(castOn.nameKey)
    if (value && value !== castOn.nameKey) return value
  }
  return ''
}

// Helper functions to get data by index or name
export const getCrochetByIndex = (index) => {
  return BasicStitch.find(item => item.index === index)
}

export const getCrochetByName = (name) => {
  return BasicStitch.find(item => item.nameKey === name)
}

export const getCrochetBySymbol = (symbol) => {
  return BasicStitch.find(item => item.symbol_jp === symbol)
}

export const getCastOnByIndex = (index) => {
  return CastOn.find(item => item.index === index)
}

export const getCastOnByName = (name) => {
  return CastOn.find(item => item.nameKey === name)
}

// Helper functions to create new data structures

/**
 * 創建一個 SimpleStitch 節點
 * @param {number} stitchId - 針法 ID
 * @returns {object} SimpleStitch 物件
 */
export const createSimpleStitch = (stitchId) => {
  const stitch = BasicStitch[stitchId]
  if (!stitch) {
    throw new Error(`Stitch at index ${stitchId} not found`)
  }
  return {
    type: 'stitch',
    stitch_id: stitchId
  }
}

/**
 * 創建一個 Bundle 節點
 * @param {Array} bundle - SimpleStitch 陣列
 * @param {number} consume - 消耗針數
 * @param {number} count - 數量
 * @param {string} label - 選填的標籤
 * @returns {object} Bundle 物件
 */
export const createBundle = (bundle = [], consume = 1, count = 1, label = null) => {
  const totalGenerate = calculateConsumeGenerateCore(bundle, 1, BasicStitch).generate

  const node = {
    type: 'bundle',
    bundle,
    consume,
    generate: totalGenerate,
    count
  }
  if (label) {
    node.label = label
  }
  return node
}

/**
 * 創建一個 Pattern 節點
 * @param {number} repeatCount - 重複次數
 * @param {Array} pattern - SingleAnchor 陣列 (SimpleStitch 或 Bundle)
 * @param {string} label - 選填的標籤
 * @returns {object} Pattern 物件
 */
export const createPattern = (count, pattern = [], label = null) => {
  const stats = calculateConsumeGenerateCore(pattern, count, BasicStitch)

  const node = {
    type: 'pattern',
    pattern,
    count,
    consume: stats.consume,
    generate: stats.generate
  }
  if (label) {
    node.label = label
  }
  return node
}

/**
 * 創建一個 Row
 * @param {number} rowIndex - 行索引
 * @param {Array} stitchNodeList - StitchNode 陣列
 * @returns {object} Row 物件
 */
export const createRow = (rowIndex, stitchNodeList = []) => {
  return {
    row_index: rowIndex,
    content: {
      stitch_node_list: stitchNodeList,
      generate: 0,
      consume: 0
    },
    count: 1
  }
}

/**
 * 計算並更新 Row 的 consume 和 generate
 * NOTE: This function is kept for backward compatibility and validation purposes.
 * In the current architecture, CrochetDisplay.vue is responsible for calculating
 * generate and consume values when modifying stitch_node_list. This function should
 * only be used to validate or update values that have already been calculated by CrochetDisplay.
 * @param {object} row - Row 物件
 */
export const updateRowStats = (row) => {
  const stats = calculateConsumeGenerateCore(row?.content?.stitch_node_list || [], 1, BasicStitch)
  row.content.consume = stats.consume
  row.content.generate = stats.generate
}

// Display helpers
export const getPatternItemDisplay = (anchor) => {
  if (anchor.type === 'stitch') {
    const stitch = BasicStitch[anchor.stitch_id]
    if (!stitch) return '?'
    const count = anchor.count || 1
    return count > 1 ? `${count}${stitch.symbol_jp}` : stitch.symbol_jp
  } else if (anchor.type === 'bundle') {
    const items = anchor.bundle?.flatMap(item => {
      const stitch = BasicStitch[item.stitch_id]
      if (!stitch) return []
      return Array(item.count || 1).fill(stitch.symbol_jp)
    }).join(', ') || ''
    const count = anchor.count || 1
    return count > 1 ? `(${items}) * ${count}` : `(${items})`
  } else if (anchor.type === 'pattern') {
    if (anchor.pattern?.length === 1 && anchor.pattern[0].type === 'stitch') {
      const stitch = BasicStitch[anchor.pattern[0].stitch_id]
      if (!stitch) return ''
      const count = anchor.count || 1
      return (count > 1 ? `${count}` : '') + stitch.symbol_jp
    }

    const text = (anchor.pattern || []).map(getPatternItemDisplay).join(', ')
    const count = anchor.count || 1
    return `[${text}] * ${count}`
  }
  return ''
}
