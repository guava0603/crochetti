// Normalizes `notes` fields in component_list in-place so Firestore storage is consistent.
// Notes stay as notes: this function always normalizes to `string[]`.
// - Accepts legacy `{ description: string }` note items and converts them to strings
// - Trims empty notes and removes the field when empty
export function normalizeEmptyNotesForSaveInPlace(componentList) {
  const list = Array.isArray(componentList) ? componentList : []
  for (const component of list) {
    if (!component || typeof component !== 'object') continue
    if (!('notes' in component)) continue

    const notes = component.notes

    if (Array.isArray(notes)) {
      const cleaned = notes
        .filter((n) => n != null)
        .map((n) => (typeof n === 'string' ? n : String(n?.description ?? '')))
        .map((n) => String(n ?? '').trim())
        .filter(Boolean)

      if (cleaned.length) component.notes = cleaned
      else delete component.notes
    } else if (typeof notes === 'string') {
      const cleaned = notes.trim()
      if (cleaned) component.notes = [cleaned]
      else delete component.notes
    } else {
      delete component.notes
    }
  }
}
