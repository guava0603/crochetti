import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useTextCount } from '@/composables/useTextCount'

describe('useTextCount', () => {
  it('counts chars and detects over limit', () => {
    const text = ref('abc')
    const { count, showCounter, isOverLimit, limit } = useTextCount(text, () => ({
      limit: 2,
      countMode: 'chars'
    }))

    expect(count.value).toBe(3)
    expect(limit.value).toBe(2)
    expect(showCounter.value).toBe(true)
    expect(isOverLimit.value).toBe(true)
  })

  it('hides counter when limit is unset', () => {
    const text = ref('hello world')
    const { showCounter, isOverLimit } = useTextCount(text, () => ({}))

    expect(showCounter.value).toBe(false)
    expect(isOverLimit.value).toBe(false)
  })
})
