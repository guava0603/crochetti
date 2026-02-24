const safeInt = (value, fallback = 1) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.floor(n)
}

export const getComponentCount = (component) => {
  const raw = component?.count
  const n = safeInt(raw, 1)
  return Math.max(1, n)
}

export const ensureComponentCountInPlace = (component) => {
  if (!component || typeof component !== 'object') return
  const n = getComponentCount(component)
  component.count = n
}

const deepClone = (value) => JSON.parse(JSON.stringify(value))

export const expandComponentListByCount = (
  componentList,
  {
    resetEndAt = false,
    includeInstanceMeta = true
  } = {}
) => {
  const list = Array.isArray(componentList) ? componentList : []
  const expanded = []

  for (let baseIndex = 0; baseIndex < list.length; baseIndex += 1) {
    const base = list[baseIndex]
    const total = getComponentCount(base)

    for (let instanceIndex = 0; instanceIndex < total; instanceIndex += 1) {
      const clone = deepClone(base)

      // Each expanded instance represents exactly one physical component.
      clone.count = 1

      if (resetEndAt) {
        clone.end_at = null
      }

      if (includeInstanceMeta && total > 1) {
        clone._instance = {
          base_index: baseIndex,
          index: instanceIndex + 1,
          total
        }
      }

      expanded.push(clone)
    }
  }

  return expanded
}

export const normalizeComponentListForRecord = (projectComponentList) => {
  // Records should track progress per *physical* component instance.
  // Expand by `count` and reset `end_at` for a fresh record.
  return expandComponentListByCount(projectComponentList, { resetEndAt: true })
}

export const normalizeRecordForComponentCountsInPlace = (record) => {
  if (!record || typeof record !== 'object') return

  const originalList = Array.isArray(record.component_list) ? record.component_list : []
  const hasRepeated = originalList.some((c) => getComponentCount(c) > 1)

  // Always ensure a stable `count` field for downstream logic.
  for (const component of originalList) ensureComponentCountInPlace(component)

  if (!hasRepeated) return

  const expanded = expandComponentListByCount(originalList, { resetEndAt: false })
  record.component_list = expanded

  const slots = Array.isArray(record.time_slots) ? record.time_slots : []
  for (const slot of slots) {
    if (!slot || typeof slot !== 'object') continue

    const endAtList = slot.end_at_list

    if (Array.isArray(endAtList)) {
      // If this snapshot was taken before expansion existed, it will match the
      // unexpanded component_list length. Expand it using the original counts.
      if (endAtList.length === originalList.length) {
        const expandedEndAt = []
        for (let i = 0; i < originalList.length; i += 1) {
          const total = getComponentCount(originalList[i])
          const baseEndAt = endAtList[i] ?? null
          for (let r = 0; r < total; r += 1) {
            expandedEndAt.push(baseEndAt ? { ...baseEndAt } : null)
          }
        }
        slot.end_at_list = expandedEndAt
        continue
      }

      // Otherwise, just pad/truncate to match the expanded list.
      const next = endAtList
        .slice(0, expanded.length)
        .map((e) => (e ? { ...e } : null))
      while (next.length < expanded.length) next.push(null)
      slot.end_at_list = next
      continue
    }

    if ('end_at_list' in slot) {
      // Keep field shape stable for any UI that expects it.
      slot.end_at_list = Array.from({ length: expanded.length }, () => null)
    }
  }
}
