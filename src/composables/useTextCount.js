import { computed, toValue } from 'vue'
import { countChars, countWordsLike } from '@/utils/textCount'

/**
 * Shared text count state for TextInput and LimitedTextArea.
 * @param {import('vue').MaybeRefOrGetter<string>} textSource
 * @param {import('vue').MaybeRefOrGetter<{ limit?: number | null, countMode?: 'chars' | 'wordsLike' }>} configSource
 */
export function useTextCount(textSource, configSource) {
  const countMode = computed(() => {
    const mode = toValue(configSource)?.countMode
    return mode === 'chars' ? 'chars' : 'wordsLike'
  })

  const limit = computed(() => {
    const n = Number(toValue(configSource)?.limit)
    return Number.isFinite(n) && n > 0 ? n : null
  })

  const count = computed(() => {
    const text = toValue(textSource)
    return countMode.value === 'chars' ? countChars(text) : countWordsLike(text)
  })

  const showCounter = computed(() => limit.value != null)

  const isOverLimit = computed(() => showCounter.value && count.value > limit.value)

  return { count, limit, countMode, showCounter, isOverLimit }
}
