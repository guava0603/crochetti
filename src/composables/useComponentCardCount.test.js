import { describe, expect, it } from 'vitest'
import { clampComponentCount, ensureComponentCountOnComponent } from '@/composables/useComponentCardCount'

describe('useComponentCardCount helpers', () => {
  it('clamps count between 1 and 99', () => {
    expect(clampComponentCount(0)).toBe(1)
    expect(clampComponentCount(3.8)).toBe(3)
    expect(clampComponentCount(120)).toBe(99)
    expect(clampComponentCount('bad')).toBe(1)
  })

  it('initializes missing count on component', () => {
    const component = { name: 'part' }
    ensureComponentCountOnComponent(component)
    expect(component.count).toBe(1)
  })

  it('normalizes existing count on component', () => {
    const component = { count: 5 }
    ensureComponentCountOnComponent(component)
    expect(component.count).toBe(5)
  })
})
