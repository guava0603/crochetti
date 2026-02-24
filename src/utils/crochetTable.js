export function isGroupedRow(row) {
  return row?.group_index !== undefined && row?.group_index !== null
}

/**
 * Returns true when the row at `index` begins a new row-group block.
 * This is used to apply visual spacing (e.g. `row-container--grouped-start`).
 */
export function isRowContainerGroupedStart(rows, index) {
  if (!Array.isArray(rows)) return false
  if (index == null || index < 0 || index >= rows.length) return false

  const currentRow = rows[index]
  if (currentRow.count > 1) return true
  if (!isGroupedRow(currentRow)) return false

  if (index === 0) return true

  const previousRow = rows[index - 1]
  if (!isGroupedRow(previousRow)) return true

  return previousRow.group_index !== currentRow.group_index
}
