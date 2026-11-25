// Normalization ("clean") for crochet stitch-node trees. Runs on every row save
// (CrochetDisplay → crochetValidate) and in the data migration script.
//
// Data model: SingleAnchor = SimpleStitch | Bundle | Pattern | RopeBundle.
// Every anchor carries `count` (default 1):
//   { type: 'stitch',  stitch_id, position?, label?, count }
//   { type: 'bundle',  bundle: SimpleStitch[], consume, generate?, label?, count }
//   { type: 'pattern', pattern: SingleAnchor[], label?, count }
//   { type: 'rope',    chain_count, label?, count }
//
// Rules, applied from the innermost lists outward:
// 1. `count` is an integer ≥ 1 on every anchor; `count` ≤ 0 removes the anchor.
// 2. Empty patterns / bundles are removed.
// 3. A pattern with count 1 (and no label) is unwrapped into its parent list.
// 4. A pattern with a single child (and no label) becomes that child, with the
//    counts multiplied: [X] × 6 → X(count 6). (Replaces the old "compact pattern".)
// 5. Neighbouring anchors that are the same apart from `count` are merged and
//    their counts summed: X, X(2) → X(3); [A,B]×2, [A,B]×3 → [A,B]×5.
// 6. Bundle-specific: nested bundles are flattened; (X, X) / (2X) → V, and the
//    same for T/F/E; a consume-1 bundle holding one single stitch becomes that stitch.
//
// This module must stay free of browser-only imports (i18n, localStorage) so the
// migration script can run it in Node.

import { getRopeChainCount } from './ropeChainCount.js'

// Base stitch → increase variant (X→V, T→TV, F→FV, E→EV). Kept as a fixed map so this
// module does not import crochetData (which pulls in i18n). Checked against
// getVariantStitchId in crochetValidate.test.js.
export const INCREASE_VARIANT_BY_BASE = Object.freeze({ 4: 5, 7: 8, 10: 11, 13: 14 })

// Stored stats that are derived from children and must not block a merge.
const DERIVED_KEYS = new Set(['count', 'generate'])
const PATTERN_DERIVED_KEYS = new Set(['count', 'generate', 'consume'])

const KNOWN_TYPES = new Set(['stitch', 'pattern', 'bundle', 'rope'])

function isCrochetNode(value) {
  return Boolean(value) && typeof value === 'object' && KNOWN_TYPES.has(value.type)
}

/** Integer count; missing/invalid → 1, ≤ 0 → 0 (meaning "remove"). */
function readCount(node) {
  if (node?.count === undefined || node?.count === null || node?.count === '') return 1
  const n = Number(node.count)
  if (!Number.isFinite(n)) return 1
  return Math.max(0, Math.floor(n))
}

function normalizePosition(raw) {
  return typeof raw === 'string' ? raw.trim().toUpperCase() : ''
}

function withLabel(out, node) {
  if (node?.label) out.label = node.label
  return out
}

/** Comparable identity of an anchor, ignoring `count` and derived stats. */
function identityKey(node) {
  const skip = node?.type === 'pattern' ? PATTERN_DERIVED_KEYS : DERIVED_KEYS
  const stable = (value) => {
    if (Array.isArray(value)) return value.map(stable)
    if (value && typeof value === 'object') {
      const out = {}
      for (const key of Object.keys(value).sort()) {
        if (value === node && skip.has(key)) continue
        out[key] = value[key] && typeof value[key] === 'object' ? stable(value[key]) : value[key]
      }
      return out
    }
    return value
  }
  return JSON.stringify(stable(node))
}

/** Rule 5: merge neighbours that only differ by `count`. */
function mergeNeighbours(list) {
  const out = []
  for (const node of list) {
    const last = out[out.length - 1]
    if (last && identityKey(last) === identityKey(node)) {
      const merged = { ...last, count: readCount(last) + readCount(node) }
      if (merged.type === 'pattern') {
        // Stored pattern stats described one copy; they are recomputed from children anyway.
        delete merged.consume
        delete merged.generate
      }
      out[out.length - 1] = merged
      continue
    }
    out.push(node)
  }
  return out
}

/** Rules 1–5 for one list: normalize children, drop removed, unwrap ×1 patterns, merge. */
function normalizeList(list, { insideBundle = false } = {}) {
  const safe = Array.isArray(list) ? list : []
  const flat = []
  for (const raw of safe) {
    const node = normalizeNode(raw)
    if (!node) continue
    // Rule 6: a bundle never contains another bundle.
    if (insideBundle && node.type === 'bundle') {
      for (let i = 0; i < readCount(node); i += 1) {
        for (const inner of node.bundle) flat.push(JSON.parse(JSON.stringify(inner)))
      }
      continue
    }
    // Rule 3: pattern × 1 without a label is just its children.
    if (node.type === 'pattern' && readCount(node) === 1 && !node.label) {
      flat.push(...node.pattern)
      continue
    }
    flat.push(node)
  }
  return mergeNeighbours(flat)
}

function normalizeStitch(node) {
  if (typeof node.stitch_id !== 'number') return null
  const out = { type: 'stitch', stitch_id: node.stitch_id }
  const position = normalizePosition(node.position)
  if (position) out.position = position
  withLabel(out, node)
  out.count = readCount(node)
  return out
}

function normalizeRope(node) {
  const out = withLabel({ type: 'rope', chain_count: getRopeChainCount(node) }, node)
  out.count = readCount(node)
  return out
}

function normalizeBundle(node) {
  const children = normalizeList(node.bundle, { insideBundle: true })
  if (!children.length) return null

  const count = readCount(node)
  const consume = Number(node.consume || 1)

  // Rule 6: (X, X) or (2X) in one stitch → V (likewise T/F/E), when the bundle runs once.
  if (consume === 1 && count === 1 && children.length === 1) {
    const only = children[0]
    const variant = INCREASE_VARIANT_BY_BASE[only.stitch_id]
    if (only.type === 'stitch' && only.count === 2 && !only.position && variant !== undefined) {
      return withLabel({ type: 'stitch', stitch_id: variant, count: 1 }, node)
    }
  }

  // Rule 6: a consume-1 bundle holding exactly one single stitch is that stitch (× bundle count).
  if (consume === 1 && children.length === 1 && children[0].type === 'stitch' && children[0].count === 1) {
    const only = children[0]
    const out = { type: 'stitch', stitch_id: only.stitch_id }
    if (only.position) out.position = only.position
    withLabel(out, node)
    out.count = count
    return out
  }

  const out = { ...node, bundle: children, count }
  return out
}

function normalizePattern(node) {
  const children = normalizeList(node.pattern)
  if (!children.length) return null

  const count = readCount(node)

  // Rule 4: a single child absorbs the pattern's repeat.
  if (children.length === 1 && !node.label) {
    const only = children[0]
    const merged = { ...only, count: readCount(only) * count }
    return merged
  }

  return { ...node, pattern: children, count }
}

/** Normalize one anchor; returns null when it should be removed. */
function normalizeNode(node) {
  if (!isCrochetNode(node)) return node ?? null
  if (readCount(node) === 0) return null // Rule 1

  if (node.type === 'stitch') return normalizeStitch(node)
  if (node.type === 'rope') return normalizeRope(node)
  if (node.type === 'bundle') return normalizeBundle(node)
  return normalizePattern(node)
}

/**
 * Clean a row's stitch-node list (row save and the data migration both pass a list).
 * @param {Array} stitchNodeList
 * @returns {Array} a new, normalized list
 */
export function crochetValidate(stitchNodeList) {
  return normalizeList(stitchNodeList)
}
