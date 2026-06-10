export function clampComponentCount(value) {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n)) return 1
  return Math.min(99, Math.max(1, n))
}

export function ensureComponentCountOnComponent(component) {
  if (!component || typeof component !== 'object') return
  if (component.count == null) {
    component.count = 1
    return
  }
  component.count = clampComponentCount(component.count)
}
