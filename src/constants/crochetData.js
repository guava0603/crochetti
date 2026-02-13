// Fixed data structures for crochet terminology and techniques

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
    nameKey: 'crochet.stitches.singleCrochetIncrease',
    symbol_jp: 'V',
    consume: 1,
    generate: 2
  },
  {
    index: 6,
    nameKey: 'crochet.stitches.singleCrochetDecrease',
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
    nameKey: 'crochet.stitches.halfDoubleCrochetIncrease',
    symbol_jp: 'TV',
    consume: 1,
    generate: 2
  },
  {
    index: 9,
    nameKey: 'crochet.stitches.halfDoubleCrochetDecrease',
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
    nameKey: 'crochet.stitches.doubleCrochetIncrease',
    symbol_jp: 'FV',
    consume: 1,
    generate: 2
  },
  {
    index: 12,
    nameKey: 'crochet.stitches.doubleCrochetDecrease',
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
    nameKey: 'crochet.stitches.trebleCrochetIncrease',
    symbol_jp: 'EV',
    consume: 1,
    generate: 2
  },
  {
    index: 15,
    nameKey: 'crochet.stitches.trebleCrochetDecrease',
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
  // Calculate generate from bundle
  let totalGenerate = 0

  bundle.forEach(simpleStitch => {
    const stitch = BasicStitch[simpleStitch.stitch_id]
    if (stitch) {
      totalGenerate += (stitch.generate || 0) * (simpleStitch.count || 1)
    }
  })

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
  const calculatePatternStats = (patternItems, repeatCount = 1) => {
    let totalConsume = 0
    let totalGenerate = 0

    patternItems.forEach(anchor => {
      if (anchor.type === 'stitch') {
        const stitch = BasicStitch[anchor.stitch_id]
        if (stitch) {
          const stitchCount = anchor.count || 1
          totalConsume += (stitch.consume || 0) * stitchCount
          totalGenerate += (stitch.generate || 0) * stitchCount
        }
      } else if (anchor.type === 'bundle') {
        const bundleCount = anchor.count || 1
        totalConsume += (anchor.consume || 1) * bundleCount
        totalGenerate += (anchor.generate || 0) * bundleCount
      } else if (anchor.type === 'pattern') {
        const nested = calculatePatternStats(anchor.pattern || [], anchor.count || 1)
        totalConsume += nested.consume
        totalGenerate += nested.generate
      }
    })

    return {
      consume: totalConsume * repeatCount,
      generate: totalGenerate * repeatCount
    }
  }

  const stats = calculatePatternStats(pattern, count)

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
  let totalConsume = 0
  let totalGenerate = 0

  row.content.stitch_node_list.forEach(node => {
    if (node.type === 'stitch') {
      const stitch = BasicStitch[node.stitch_id]
      if (stitch) {
        totalConsume += (stitch.consume || 0) * (node.count || 1)
        totalGenerate += (stitch.generate || 0) * (node.count || 1)
      }
    } else if (node.type === 'pattern') {
      const patternStats = createPattern(node.count || 1, node.pattern || [])
      totalConsume += patternStats.consume || 0
      totalGenerate += patternStats.generate || 0
    }
  })

  row.content.consume = totalConsume
  row.content.generate = totalGenerate
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
    return count > 1 ? `${count}(${items})` : `(${items})`
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
