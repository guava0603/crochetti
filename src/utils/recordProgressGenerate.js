import { createSelection, isInSelection } from '@/constants/selection'

export const clampCrochetCount = (crochetCount, baseGenerate) => {
  let cc = Number(crochetCount ?? 0)
  if (!Number.isFinite(cc)) cc = 0
  cc = Math.max(0, Math.floor(cc))

  const gen = Number(baseGenerate ?? 0)
  if (Number.isFinite(gen) && gen > 0) {
    // `crochet_count` represents how many stitches have been generated within the row.
    // Allow exactly `gen` to represent completing the entire row.
    cc = Math.min(cc, gen)
  }

  return cc
}

export const findRowWithRepeated = (rowList, rowGroups, targetRowIndex) => {
  const rows = Array.isArray(rowList) ? rowList : []
  const groups = Array.isArray(rowGroups) ? rowGroups : []

  const getRepeatCountForGroup = (groupIndex) => {
    const group = groups.find(g => g && g.index === groupIndex)
    return Math.max(1, Number(group?.repeat_count || 1))
  }

  let currentRowIndex = 1
  let i = 0

  while (i < rows.length) {
    const groupIndex = rows[i]?.group_index
    if (groupIndex === undefined || groupIndex === null) {
      const count = Math.max(1, Number(rows[i]?.count || 1))
      const range = createSelection(currentRowIndex, currentRowIndex + count - 1)
      if (isInSelection(range, targetRowIndex)) return rows[i]
      currentRowIndex += count
      i += 1
      continue
    }

    let j = i
    while (j < rows.length && rows[j]?.group_index === groupIndex) j += 1
    const segment = rows.slice(i, j)
    const repeatCount = getRepeatCountForGroup(groupIndex)

    for (let r = 0; r < repeatCount; r += 1) {
      for (const row of segment) {
        const count = Math.max(1, Number(row?.count || 1))
        const range = createSelection(currentRowIndex, currentRowIndex + count - 1)
        if (isInSelection(range, targetRowIndex)) return row
        currentRowIndex += count
      }
    }

    i = j
  }

  return null
}

const getRowGenerate = (row) => Math.max(0, Number(row?.content?.generate ?? row?.generate ?? 0))

export const getComponentTotalGeneratesExpanded = (component) => {
  const rows = Array.isArray(component?.content?.row_list) ? component.content.row_list : []
  const groups = Array.isArray(component?.content?.row_groups) ? component.content.row_groups : []

  const getRepeatCountForGroup = (groupIndex) => {
    const group = groups.find(g => g && g.index === groupIndex)
    return Math.max(1, Number(group?.repeat_count || 1))
  }

  let total = 0
  let i = 0
  while (i < rows.length) {
    const groupIndex = rows[i]?.group_index
    if (groupIndex === undefined || groupIndex === null) {
      const count = Math.max(1, Number(rows[i]?.count || 1))
      total += getRowGenerate(rows[i]) * count
      i += 1
      continue
    }

    let j = i
    while (j < rows.length && rows[j]?.group_index === groupIndex) j += 1
    const segment = rows.slice(i, j)
    const repeatCount = getRepeatCountForGroup(groupIndex)

    let segmentTotal = 0
    for (const row of segment) {
      const count = Math.max(1, Number(row?.count || 1))
      segmentTotal += getRowGenerate(row) * count
    }

    total += segmentTotal * repeatCount
    i = j
  }

  return total
}

export const getComponentGeneratedBeforeRowIndex = (component, targetRowIndex) => {
  const target = Number(targetRowIndex ?? 0)
  if (!Number.isFinite(target) || target <= 1) return 0

  const rows = Array.isArray(component?.content?.row_list) ? component.content.row_list : []
  const groups = Array.isArray(component?.content?.row_groups) ? component.content.row_groups : []

  const getRepeatCountForGroup = (groupIndex) => {
    const group = groups.find(g => g && g.index === groupIndex)
    return Math.max(1, Number(group?.repeat_count || 1))
  }

  let generated = 0
  let currentRowIndex = 1

  let i = 0
  while (i < rows.length) {
    const groupIndex = rows[i]?.group_index
    if (groupIndex === undefined || groupIndex === null) {
      const count = Math.max(1, Number(rows[i]?.count || 1))
      for (let c = 0; c < count; c += 1) {
        if (currentRowIndex >= target) return generated
        generated += getRowGenerate(rows[i])
        currentRowIndex += 1
      }
      i += 1
      continue
    }

    let j = i
    while (j < rows.length && rows[j]?.group_index === groupIndex) j += 1
    const segment = rows.slice(i, j)
    const repeatCount = getRepeatCountForGroup(groupIndex)

    for (let r = 0; r < repeatCount; r += 1) {
      for (const row of segment) {
        const count = Math.max(1, Number(row?.count || 1))
        for (let c = 0; c < count; c += 1) {
          if (currentRowIndex >= target) return generated
          generated += getRowGenerate(row)
          currentRowIndex += 1
        }
      }
    }

    i = j
  }

  return generated
}

export const getComponentProgressPercent = (component) => {
  if (!component?.end_at) return 0

  const totalGenerates = getComponentTotalGeneratesExpanded(component)
  if (!Number.isFinite(totalGenerates) || totalGenerates <= 0) return 0

  const endAt = component.end_at
  const before = getComponentGeneratedBeforeRowIndex(component, endAt?.row_index)
  const baseRow = findRowWithRepeated(component.content?.row_list, component.content?.row_groups, endAt?.row_index)
  const baseGenerate = Number(baseRow?.content?.generate ?? baseRow?.generate ?? 0)
  const within = clampCrochetCount(endAt?.crochet_count, baseGenerate)

  const currentGenerated = Math.min(totalGenerates, Math.max(0, Number(before || 0) + Number(within || 0)))
  return Math.round(currentGenerated * 100 / totalGenerates)
}
