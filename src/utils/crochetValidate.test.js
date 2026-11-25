import { describe, expect, it, beforeAll } from 'vitest'
import { crochetValidate, INCREASE_VARIANT_BY_BASE } from './crochetValidate.js'
import { calculateConsumeGenerateCore } from './crochetStatsCore.js'

const X = 4
const T = 7
const st = (stitch_id, count, extra = {}) => ({ type: 'stitch', stitch_id, ...(count === undefined ? {} : { count }), ...extra })
const pat = (pattern, count) => ({ type: 'pattern', pattern, count })
const bun = (bundle, count, consume = 1) => ({ type: 'bundle', bundle, consume, count })
const rope = (chain_count, count) => ({ type: 'rope', chain_count, ...(count === undefined ? {} : { count }) })

describe('crochetValidate: count on every anchor', () => {
  it('adds count 1 to every anchor that has none', () => {
    expect(crochetValidate([st(X), rope(5), bun([st(X), st(T)])])).toEqual([
      st(X, 1),
      rope(5, 1),
      { type: 'bundle', bundle: [st(X, 1), st(T, 1)], consume: 1, count: 1 }
    ])
  })

  it('turns a one-stitch pattern into a stitch with count', () => {
    expect(crochetValidate([pat([st(X)], 6)])).toEqual([st(X, 6)])
    expect(crochetValidate([pat([st(X, 2)], 3)])).toEqual([st(X, 6)])
    expect(crochetValidate([pat([pat([st(X)], 2)], 3)])).toEqual([st(X, 6)])
  })

  it('unwraps patterns with count 1', () => {
    expect(crochetValidate([pat([st(X), st(T)], 1)])).toEqual([st(X, 1), st(T, 1)])
  })

  it('keeps labelled patterns', () => {
    const labelled = { ...pat([st(X)], 3), label: 'A' }
    expect(crochetValidate([labelled])).toEqual([{ type: 'pattern', pattern: [st(X, 1)], count: 3, label: 'A' }])
  })
})

describe('crochetValidate: count 0 removes', () => {
  it('removes any anchor with count 0, and parents left empty', () => {
    expect(crochetValidate([st(X, 0), st(T)])).toEqual([st(T, 1)])
    expect(crochetValidate([rope(5, 0), bun([st(X)], 0), pat([st(X), st(T)], 0)])).toEqual([])
    expect(crochetValidate([pat([st(X, 0)], 4), st(T)])).toEqual([st(T, 1)])
  })
})

describe('crochetValidate: merge neighbours that differ only by count', () => {
  it('merges stitches, including positions', () => {
    expect(crochetValidate([st(X), st(X, 2), st(T)])).toEqual([st(X, 3), st(T, 1)])
    expect(crochetValidate([st(X, 1, { position: 'fp' }), st(X, 1, { position: 'FP' }), st(X)])).toEqual([
      st(X, 2, { position: 'FP' }),
      st(X, 1)
    ])
  })

  it('merges patterns, bundles and ropes', () => {
    expect(crochetValidate([pat([st(X), st(T)], 2), pat([st(X), st(T)], 3)])).toEqual([pat([st(X, 1), st(T, 1)], 5)])
    expect(crochetValidate([bun([st(X), st(T)]), bun([st(X), st(T)], 2)])).toEqual([
      { type: 'bundle', bundle: [st(X, 1), st(T, 1)], consume: 1, count: 3 }
    ])
    expect(crochetValidate([rope(5), rope(5, 2), rope(6)])).toEqual([rope(5, 3), rope(6, 1)])
  })

  it('does not merge different shapes, consumes or labels', () => {
    expect(crochetValidate([pat([st(X), st(T)], 2), pat([st(T), st(X)], 2)])).toHaveLength(2)
    expect(crochetValidate([bun([st(X), st(T)], 1, 1), bun([st(X), st(T)], 1, 2)])).toHaveLength(2)
    expect(crochetValidate([st(X, 1, { label: 'a' }), st(X)])).toHaveLength(2)
  })

  it('ignores stale stored pattern stats when merging', () => {
    const a = { ...pat([st(X), st(T)], 2), consume: 4, generate: 4 }
    const b = { ...pat([st(X), st(T)], 1), consume: 99, generate: 99 }
    // b has count 1 so it unwraps; add a second real copy to merge with.
    const c = { ...pat([st(X), st(T)], 3), consume: 6, generate: 6 }
    expect(crochetValidate([a, c])).toEqual([pat([st(X, 1), st(T, 1)], 5)])
    expect(crochetValidate([b])).toEqual([st(X, 1), st(T, 1)])
  })

  it('merges from the inside out, including after unwrapping', () => {
    // [X, X] × 1 next to X → X(3)
    expect(crochetValidate([pat([st(X), st(X)], 1), st(X)])).toEqual([st(X, 3)])
    // inner list merges first, then the outer pattern becomes a one-stitch pattern → stitch
    expect(crochetValidate([pat([st(X), st(X)], 2)])).toEqual([st(X, 4)])
  })
})

describe('crochetValidate: bundles', () => {
  it('turns (X, X) and (2X) into V', () => {
    expect(crochetValidate([bun([st(X), st(X)])])).toEqual([st(INCREASE_VARIANT_BY_BASE[X], 1)])
    expect(crochetValidate([bun([st(X, 2)])])).toEqual([st(INCREASE_VARIANT_BY_BASE[X], 1)])
  })

  it('keeps (3X) as a bundle and simplifies (E) × 2 to E(2)', () => {
    expect(crochetValidate([bun([st(X, 3)])])).toEqual([{ type: 'bundle', bundle: [st(X, 3)], consume: 1, count: 1 }])
    expect(crochetValidate([bun([st(13)], 2)])).toEqual([st(13, 2)])
  })

  it('flattens nested bundles', () => {
    expect(crochetValidate([bun([bun([st(X), st(T)]), st(T)])])).toEqual([
      { type: 'bundle', bundle: [st(X, 1), st(T, 2)], consume: 1, count: 1 }
    ])
  })
})

describe('crochetValidate: stitch totals never change', () => {
  const lookup = Array.from({ length: 20 }, (_, i) => ({ consume: 1, generate: i === 5 ? 2 : 1 }))
  const rows = [
    [pat([st(X)], 6), st(X), st(X, 2), rope(4), rope(4, 2)],
    [pat([pat([st(X), st(T)], 1), st(X)], 3), bun([st(X), st(X)])],
    [pat([st(X), st(T)], 2), pat([st(X), st(T)], 3), st(X, 0), bun([st(T)], 3)]
  ]
  it.each(rows.map((r, i) => [i, r]))('row %i keeps consume/generate', (_, row) => {
    const before = calculateConsumeGenerateCore(row, 1, lookup)
    const after = calculateConsumeGenerateCore(crochetValidate(row), 1, lookup)
    // count-0 anchors are removed on purpose, so compare against the row without them.
    const withoutZero = calculateConsumeGenerateCore(row.filter((n) => n.count !== 0), 1, lookup)
    expect(after).toEqual(row.some((n) => n.count === 0) ? withoutZero : before)
  })
})

describe('crochetValidate: idempotent', () => {
  it('cleaning twice equals cleaning once', () => {
    const row = [pat([st(X)], 6), st(X), pat([pat([st(X), st(T)], 1), bun([st(X), st(X)])], 2), rope(3), rope(3), st(T, 0)]
    const once = crochetValidate(row)
    expect(crochetValidate(once)).toEqual(once)
  })
})

describe('INCREASE_VARIANT_BY_BASE', () => {
  let getVariantStitchId
  beforeAll(async () => {
    // crochetData imports i18n, which reads localStorage at load time.
    globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} }
    globalThis.navigator ??= { language: 'zh-TW', languages: ['zh-TW'] }
    ;({ getVariantStitchId } = await import('@/constants/crochetData.js'))
  })

  it('matches getVariantStitchId', () => {
    for (const [base, variant] of Object.entries(INCREASE_VARIANT_BY_BASE)) {
      expect(getVariantStitchId(Number(base), 'increase')).toBe(variant)
    }
  })
})
