import { computed, ref, unref, watch } from 'vue'

function clampCount(value) {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n)) return 1
  return Math.min(99, Math.max(1, n))
}

export function useComponentCardCount(componentSource) {
  const component = computed(() => unref(componentSource))
  const countDraft = ref(1)

  function ensureCountField() {
    const c = component.value
    if (!c || typeof c !== 'object') return
    if (c.count == null) {
      c.count = 1
    } else {
      c.count = clampCount(c.count)
    }
  }

  function resetCountDraft() {
    ensureCountField()
    countDraft.value = clampCount(component.value?.count ?? 1)
  }

  function commitCountDraft() {
    const c = component.value
    if (!c || typeof c !== 'object') return
    const next = clampCount(countDraft.value)
    c.count = next
    countDraft.value = next
  }

  function handleUpdateCountDraft(nextValue) {
    const c = component.value
    if (!c || typeof c !== 'object') return
    const next = clampCount(nextValue)
    countDraft.value = next
    c.count = next
  }

  watch(component, resetCountDraft, { immediate: true, deep: true })

  return {
    countDraft,
    handleUpdateCountDraft,
    commitCountDraft
  }
}
