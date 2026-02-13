// Shared range helpers

export const createSelection = (start = null, end = null) => ({ start, end })

export const isNoSelection = (range = null) => (!range || range.start === null || range.end === null)
export const isSingleSelection = (range) => (!isNoSelection(range) && range.start === range.end)
export const isRangeSelection = (range) => (!isNoSelection(range) && range.start !== range.end)
export const isFullSelection = (range, totalCount) => (!isNoSelection(range) && range.start === 0 && range.end === totalCount - 1)
export const isPartialSelection = (range, totalCount) => (isRangeSelection(range) && !isFullSelection(range, totalCount))

export const isInSelection = (range, index) => {
  if (!range || range.start === null || range.end === null) return false
  const start = Math.min(range.start, range.end)
  const end = Math.max(range.start, range.end)
  return index >= start && index <= end
}

export const updateSelection = (range, index) => {
  if (isNoSelection(range)) {
    return createSelection(index, index)
  } else if (isSingleSelection(range)) {
    return createSelection(Math.min(range.start, index), Math.max(range.start, index))
  } else {
    if (isInSelection(range, index)) {
      return null
    } else {
      const start = Math.min(range.start, index)
      const end = Math.max(index, range.end)
      return createSelection(start, end)
    }
  }
}
