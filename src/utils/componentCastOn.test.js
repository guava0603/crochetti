import { describe, expect, it, vi } from 'vitest'

vi.mock('@/constants/crochetData', () => ({
  CAST_ON_OTHER_INDEX: 4,
  getCastOnByIndex: (index) => {
    if (index === 0) return { index: 0, nameKey: 'crochet.castOn.magicRing' }
    if (index === 2) return { index: 2, nameKey: 'crochet.castOn.flat' }
    return null
  },
  getCastOnDisplayName: (castOn, t) => (castOn?.nameKey ? t(castOn.nameKey) : '')
}))

import { getComponentCastOnLabel, shouldVerifyRowCounts } from '@/utils/componentCastOn'

describe('getComponentCastOnLabel', () => {
  const t = (key) => {
    const map = {
      'crochet.castOn.magicRing': '輪狀起針',
      'crochet.castOn.flat': '片鉤起針'
    }
    return map[key] || key
  }

  it('returns localized cast-on label for crochet components', () => {
    expect(getComponentCastOnLabel({
      type: 'component-crochet',
      content: { type: 0 }
    }, t)).toBe('輪狀起針')
  })

  it('returns empty for stitch components', () => {
    expect(getComponentCastOnLabel({
      type: 'stitch',
      content: { type: 0 }
    }, t)).toBe('')
  })

  it('returns empty when cast-on type is missing', () => {
    expect(getComponentCastOnLabel({
      type: 'component-crochet',
      content: {}
    }, t)).toBe('')
  })
})

describe('shouldVerifyRowCounts', () => {
  it('is off only for cast-on 其他', () => {
    expect(shouldVerifyRowCounts({ content: { type: 4 } })).toBe(false)
    expect(shouldVerifyRowCounts({ content: { type: '4' } })).toBe(false)
    expect(shouldVerifyRowCounts({ content: { type: 0 } })).toBe(true)
    expect(shouldVerifyRowCounts({ content: {} })).toBe(true)
    expect(shouldVerifyRowCounts(null)).toBe(true)
  })
})
