/**
 * Rope chain count helpers.
 *
 * Rope node schema:
 * - { type: 'rope', chain_count: number } (preferred)
 * - legacy/editor variants may use `chainCount`
 */

/**
 * @param {unknown} raw
 * @param {number} [fallback=1]
 */
export function normalizeRopeChainCount(raw, fallback = 1) {
  const fallbackNumber = Number(fallback)
  const safeFallback = Number.isFinite(fallbackNumber) ? Math.trunc(fallbackNumber) : 1

  const n = Number(raw)
  const base = Number.isFinite(n) ? Math.trunc(n) : safeFallback

  return Math.min(99, Math.max(1, base))
}

/**
 * @param {any} node
 * @param {number} [fallback=1]
 */
export function getRopeChainCount(node, fallback = 1) {
  return normalizeRopeChainCount(node?.chain_count ?? node?.chainCount, fallback)
}
