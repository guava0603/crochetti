/** Display-ready note lines from a component `notes` field (string or legacy `{ description }`). */
export function componentNotesDisplayLines(notes) {
  const list = Array.isArray(notes) ? notes : []
  return list
    .map((n) => (typeof n === 'string' ? n : String(n?.description ?? '')))
    .map((n) => String(n ?? '').trim())
    .filter(Boolean)
}

function normalizeNotesList(notes) {
  return (Array.isArray(notes) ? notes : [])
    .filter((n) => n != null)
    .map((n) => (typeof n === 'string' ? n : String(n?.description ?? '')))
}

function notesAlreadyNormalized(notes) {
  const list = Array.isArray(notes) ? notes : []
  for (const n of list) {
    if (n == null || typeof n !== 'string') return false
  }
  return true
}

/** Ensures `component.notes` is a normalized string array (in-place). */
export function ensureComponentNotesArray(component) {
  if (!component || typeof component !== 'object') return

  if (!Array.isArray(component.notes)) {
    component.notes = []
    return
  }

  if (notesAlreadyNormalized(component.notes)) return

  component.notes = normalizeNotesList(component.notes)
}
