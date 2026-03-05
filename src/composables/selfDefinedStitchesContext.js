import { computed, inject, provide } from 'vue'

const SELF_DEFINED_STITCHES_KEY = Symbol('self-defined-stitches')

function asArray(v) {
  return Array.isArray(v) ? v : []
}

function normalizeId(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function provideSelfDefinedStitchesContext({ stitchesRef, addStitch } = {}) {
  const list = computed(() => asArray(stitchesRef?.value))

  const byId = computed(() => {
    const map = new Map()
    for (const s of list.value) {
      if (!s || typeof s !== 'object') continue
      const id = normalizeId(s.stitch_id)
      if (id === null) continue
      map.set(id, s)
    }
    return map
  })

  const ctx = {
    list,
    byId,
    addStitch: typeof addStitch === 'function' ? addStitch : null
  }

  provide(SELF_DEFINED_STITCHES_KEY, ctx)
  return ctx
}

export function useSelfDefinedStitchesContext() {
  const fallback = {
    list: computed(() => []),
    byId: computed(() => new Map()),
    addStitch: null
  }

  return inject(SELF_DEFINED_STITCHES_KEY, fallback)
}
