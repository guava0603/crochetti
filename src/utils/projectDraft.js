/** @returns {boolean} */
export function isProjectDraft(project) {
  return Boolean(project?.is_draft)
}

/** Drop draft projects from summary lists shown as published designs. */
export function filterNonDraftProjects(list) {
  const items = Array.isArray(list) ? list : []
  return items.filter((p) => p && !isProjectDraft(p))
}
