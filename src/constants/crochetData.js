// Fixed data structures for crochet terminology and techniques

import { calculateConsumeGenerateCore } from '@/utils/crochetStatsCore.js'
import { i18n } from '@/i18n'

const CROCHET_TEXT_ZH_LOCALE = 'zh-TW'

const getValueByPath = (root, path) => {
  if (!root || typeof path !== 'string' || !path) return undefined
  const parts = path.split('.')
  let current = root
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined
    current = current[part]
  }
  return current
}

const formatMessage = (message, params) => {
  if (typeof message !== 'string') return message
  if (!params || typeof params !== 'object') return message
  return message.replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key]
    return value === undefined || value === null ? '' : String(value)
  })
}

export const getLocaleText = (key, locale, params) => {
  try {
    const messages = i18n?.global?.getLocaleMessage?.(locale)
    const raw = getValueByPath(messages, key)
    if (typeof raw === 'string') return formatMessage(raw, params)
  } catch {
    // ignore
  }

  // Fallback to current global t (may return the key itself)
  try {
    return String(i18n?.global?.t?.(key, params) ?? key)
  } catch {
    return key
  }
}

export const getCrochetZhText = (key, params) => getLocaleText(key, CROCHET_TEXT_ZH_LOCALE, params)

/**
 * 定義每一針或每一組的基礎結構
 * type SingleAnchor = SimpleStitch | Bundle | Pattern;
 * type StitchNode = Pattern;
 *
 * SimpleStitch: {
 *   type: "stitch",
 *   stitch_id: number,     // 針法 ID (use BasicStitch[stitch_id] to get details)
 *   position?: string      // 選填：位置修飾 (e.g. FL/BL/FP/BP)
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
    symbol_jp: '^',
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
  }
]

// Crochet stitch display language (separate from UI i18n language).
// Stored in user profile as `user.crochet_lang: number`.
export const CROCHET_LANG = Object.freeze({
  symbol_jp: 0,
  text_zh: 1,
  icon: 2
})

// Position modifiers for stitches (only some stitches support these, e.g. X/T/F/E).
// Stored as uppercase string on stitch nodes: 'FL' | 'BL' | 'FP' | 'BP'.
export const CROCHET_STITCH_POSITION = Object.freeze({
  FL: 'FL',
  BL: 'BL',
  FP: 'FP',
  BP: 'BP'
})

// Shared option metadata for the position toggle UI.
// UI components can map `nameKey` to locale text when needed.
export const CrochetPositionOptions = Object.freeze([
  {
    index: 0,
    nameKey: 'toolbar.addCrochet.position.FL',
    symbol_jp: CROCHET_STITCH_POSITION.FL
  },
  {
    index: 1,
    nameKey: 'toolbar.addCrochet.position.BL',
    symbol_jp: CROCHET_STITCH_POSITION.BL
  },
  {
    index: 2,
    nameKey: 'toolbar.addCrochet.position.FP',
    symbol_jp: CROCHET_STITCH_POSITION.FP
  },
  {
    index: 3,
    nameKey: 'toolbar.addCrochet.position.BP',
    symbol_jp: CROCHET_STITCH_POSITION.BP
  }
])

export const CROCHET_LANG_FIELD_BY_ID = Object.freeze({
  0: 'symbol_jp',
  1: 'nameKey',
  // icon mode uses UI components for icons; string fallbacks should be Chinese text.
  2: 'nameKey'
})

const shouldTranslatePositionPrefix = (crochetLang) => {
  return Number(crochetLang) === CROCHET_LANG.text_zh || Number(crochetLang) === CROCHET_LANG.icon
}

export const getStitchDisplayText = (stitch, crochetLang = CROCHET_LANG.symbol_jp) => {
  if (!stitch) return ''
  const field = CROCHET_LANG_FIELD_BY_ID?.[Number(crochetLang)] || 'symbol_jp'

  // Keep crochet display language independent from UI locale.
  // - symbol_jp: use symbol.
  // - text_zh: use zh-TW message resolved from nameKey.
  if (field === 'nameKey' && stitch?.nameKey) {
    return getCrochetZhText(stitch.nameKey)
  }

  return stitch?.[field] || stitch?.symbol_jp || ''
}

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
 * @param {string} position - 選填：位置修飾 (e.g. FL/BL/FP/BP)
 * @returns {object} SimpleStitch 物件
 */
export const createSimpleStitch = (stitchId, position = '') => {
  const stitch = BasicStitch[stitchId]
  if (!stitch) {
    throw new Error(`Stitch at index ${stitchId} not found`)
  }
  const pos = typeof position === 'string' ? position.trim().toUpperCase() : ''
  const node = {
    type: 'stitch',
    stitch_id: stitchId
  }

  if (pos) node.position = pos
  return node
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
const normalizePosition = (position) => {
  if (typeof position !== 'string') return ''
  return position.trim().toUpperCase()
}

const isStitchNodeLike = (node) => {
  if (!node || typeof node !== 'object') return false
  if (node.type === 'stitch') return true
  return Number.isInteger(node.stitch_id)
}

const getStitchNodeDisplay = (stitchNode, crochetLang = CROCHET_LANG.symbol_jp, stitchLookup) => {
  const lookup = stitchLookup || BasicStitch
  const stitch = lookup[stitchNode?.stitch_id]
  if (!stitch) return '?'

  const count = stitchNode?.count || 1

  // Self-defined stitches always display raw `name`.
  if (typeof stitch?.name === 'string' && stitch.name.trim()) {
    const base = stitch.name.trim()
    return count > 1 ? `${count}${base}` : base
  }

  const text = getStitchDisplayText(stitch, crochetLang)

  const pos = normalizePosition(stitchNode?.position)
  if (!pos) return count > 1 ? `${count}${text}` : text

  const decorated = (() => {
    if (!shouldTranslatePositionPrefix(crochetLang)) return `${pos}${text}`

    const key = `crochet.positionPrefix.${pos}`
    const translated = getCrochetZhText(key)
    const prefix = translated === key ? pos : translated
    return `${prefix}${text}`
  })()

  return count > 1 ? `${count}${decorated}` : decorated
}

// Compress consecutive identical stitches in a list into a single stitch node with `count`.
// (Used for display-time formatting like: '^, ^, ^' -> '3^')
const compactConsecutiveStitches = (nodes = []) => {
  if (!Array.isArray(nodes) || nodes.length === 0) return []

  /** @type {any[]} */
  const out = []
  for (const node of nodes) {
    if (!isStitchNodeLike(node)) {
      out.push(node)
      continue
    }

    const stitchId = node.stitch_id
    const pos = normalizePosition(node.position)
    const count = node.count || 1

    const last = out[out.length - 1]
    if (isStitchNodeLike(last)) {
      const lastPos = normalizePosition(last.position)
      if (last.stitch_id === stitchId && lastPos === pos) {
        const lastCount = last.count || 1
        last.count = lastCount + count
        continue
      }
    }

    out.push({ ...node, type: 'stitch', stitch_id: stitchId, ...(pos ? { position: pos } : {}), ...(count !== 1 ? { count } : {}) })
  }

  return out
}

export const getPatternItemDisplay = (anchor, crochetLang = CROCHET_LANG.symbol_jp, stitchLookup) => {
  const isZhText = Number(crochetLang) === CROCHET_LANG.text_zh

  if (anchor.type === 'stitch') {
    return getStitchNodeDisplay(anchor, crochetLang, stitchLookup)
  } else if (anchor.type === 'bundle') {
    const items = compactConsecutiveStitches(anchor.bundle || [])
      .map((item) => (
        isStitchNodeLike(item)
          ? getStitchNodeDisplay(item, crochetLang, stitchLookup)
          : getPatternItemDisplay(item, crochetLang, stitchLookup)
      ))
      .join(', ') || ''
    const count = anchor.count || 1

    if (count > 1) {
      // JP symbols: (X, V) * 3
      // 中文：同針目中做 (X, V) 重複3針目
      return isZhText
        ? getCrochetZhText('crochet.display.bundleRepeat', { items: `(${items})`, count })
        : `(${items}) * ${count}`
    }
    return `(${items})`
  } else if (anchor.type === 'pattern') {
    if (anchor.pattern?.length === 1 && isStitchNodeLike(anchor.pattern[0])) {
      const only = anchor.pattern[0]
      const repeat = anchor.count || 1
      const innerCount = only.count || 1
      const totalCount = repeat * innerCount
      return getStitchNodeDisplay({ ...only, type: 'stitch', count: totalCount }, crochetLang, stitchLookup)
    }

    const text = compactConsecutiveStitches(anchor.pattern || [])
      .map((item) => getPatternItemDisplay(item, crochetLang, stitchLookup))
      .join(', ')
    const count = anchor.count || 1

    if (count > 1) {
      // JP symbols: [X, V] * 3
      // 中文： [X, V] 重複做3組
      return isZhText
        ? getCrochetZhText('crochet.display.patternRepeat', { items: `[${text}]`, count })
        : `[${text}] * ${count}`
    }
    return `[${text}]`
  }
  return ''
}

// Display helpers (no repeat count)
// - pattern: '[X, V] * 6' -> '[X, V]'
// - stitch: '6X' -> 'X'
// - bundle: '(X, V) * 6' -> '(X, V)'
export const getPatternItemDisplayWithoutCount = (
  anchor,
  crochetLang = CROCHET_LANG.symbol_jp,
  stitchLookup
) => {
  if (!anchor || typeof anchor !== 'object') return ''

  const lookup = stitchLookup || BasicStitch

  if (anchor.type === 'stitch') {
    const stitch = lookup[anchor.stitch_id]
    if (!stitch) return '?'

    // Self-defined stitches always display raw `name`.
    if (typeof stitch?.name === 'string' && stitch.name.trim()) {
      return stitch.name.trim()
    }

    const text = getStitchDisplayText(stitch, crochetLang)
    const pos = normalizePosition(anchor.position)
    if (!pos) return text

    if (!shouldTranslatePositionPrefix(crochetLang)) return `${pos}${text}`
    const key = `crochet.positionPrefix.${pos}`
    const translated = getCrochetZhText(key)
    const prefix = translated === key ? pos : translated
    return `${prefix}${text}`
  }

  if (anchor.type === 'bundle') {
    const items = anchor.bundle?.flatMap(item => {
      if (!isStitchNodeLike(item)) {
        return [getPatternItemDisplayWithoutCount(item, crochetLang, lookup)].filter(Boolean)
      }

      const stitch = lookup[item.stitch_id]
      if (!stitch) return []

      if (typeof stitch?.name === 'string' && stitch.name.trim()) {
        return Array(item.count || 1).fill(stitch.name.trim())
      }

      const text = getStitchDisplayText(stitch, crochetLang)
      const pos = normalizePosition(item.position)
      const decorated = (() => {
        if (!pos) return text
        if (!shouldTranslatePositionPrefix(crochetLang)) return `${pos}${text}`
        const key = `crochet.positionPrefix.${pos}`
        const translated = getCrochetZhText(key)
        const prefix = translated === key ? pos : translated
        return `${prefix}${text}`
      })()

      return Array(item.count || 1).fill(decorated)
    }).join(', ') || ''
    return `(${items})`
  }

  if (anchor.type === 'pattern') {
    if (anchor.pattern?.length === 1 && isStitchNodeLike(anchor.pattern[0])) {
      return getPatternItemDisplayWithoutCount({ ...anchor.pattern[0], type: 'stitch' }, crochetLang, lookup)
    }

    const text = (anchor.pattern || [])
      .map((item) => getPatternItemDisplayWithoutCount(item, crochetLang, lookup))
      .join(', ')
    return `[${text}]`
  }

  return ''
}
