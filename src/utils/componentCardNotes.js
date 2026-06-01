/** Display-ready note lines from a component `notes` field (string or legacy `{ description }`). */
export function componentNotesDisplayLines(notes) {
  const list = Array.isArray(notes) ? notes : []
  return list
    .map((n) => (typeof n === 'string' ? n : String(n?.description ?? '')))
    .map((n) => String(n ?? '').trim())
    .filter(Boolean)
}

/** Ensures `component.notes` is a normalized string array (in-place). */
export function ensureComponentNotesArray(component) {
  if (!component || typeof component !== 'object') return

  if (!Array.isArray(component.notes)) {
    component.notes = []
  }

  component.notes = component.notes
    .filter((n) => n != null)
    .map((n) => (typeof n === 'string' ? n : String(n?.description ?? '')))
}
