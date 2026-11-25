/**
 * @typedef {object} RecordPrintChartTokens
 * @property {string} ringTrack
 * @property {string} ringLight
 * @property {string} ringDark
 * @property {string} barFill
 * @property {string} barTrack
 */

/**
 * @param {{
 *   id: string
 *   titleKey: string
 *   architecture: string
 *   swatchColors: string[]
 *   tokens: {
 *     domain: { bg: string }
 *     card: { bg: string, border: string, shadow: string, innerBorder: string, topRadius: string, restRadius: string }
 *     chart: RecordPrintChartTokens
 *     typography: Record<string, string>
 *     badge: { circleBg: string }
 *   }
 * }} config
 */
export function definePrintStyle(config) {
  const { id, titleKey, architecture, swatchColors, tokens } = config
  const { domain, card, chart, typography, badge } = tokens

  const cssVars = {
    '--print-domain-bg': domain.bg,
    '--print-title-color': typography.title,
    '--print-completed-color': typography.completed,
    '--print-summary-color': typography.summary,
    '--print-summary-highlight': typography.summaryHighlight,
    '--print-result-title-color': typography.resultTitle,
    '--print-badge-title-color': typography.badgeTitle,
    '--print-badge-sub-color': typography.badgeSub,
    '--print-rest-title-color': typography.restTitle,
    '--print-rest-sub-color': typography.restSub,
    '--print-bar-label-color': typography.barLabel,
    '--print-note-color': typography.note,
    '--export-card-bg': card.bg,
    '--export-card-border': card.border,
    '--export-card-shadow': card.shadow,
    '--export-inner-border': card.innerBorder,
    '--export-top-radius': card.topRadius,
    '--export-rest-radius': card.restRadius,
    '--print-badge-circle-bg': badge.circleBg,
    '--print-ring-track': chart.ringTrack,
    '--print-ring-light': chart.ringLight,
    '--print-ring-dark': chart.ringDark,
    '--print-bar-fill': chart.barFill,
    '--print-bar-track': chart.barTrack
  }

  return Object.freeze({
    id,
    titleKey,
    swatchColors,
    architecture,
    themeClass: `print-style--${id}`,
    architectureClass: `print-arch--${architecture}`,
    captureBackground: domain.bg,
    cssVars,
    chart: Object.freeze({ ...chart }),
    tokens
  })
}
