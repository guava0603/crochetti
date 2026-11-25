import warm from '@/constants/recordPrintStyles/warm'
import spring from '@/constants/recordPrintStyles/spring'
import simple from '@/constants/recordPrintStyles/simple'
import modern from '@/constants/recordPrintStyles/modern'
import classic from '@/constants/recordPrintStyles/classic'
import ocean from '@/constants/recordPrintStyles/ocean'
import dusk from '@/constants/recordPrintStyles/dusk'

import '@/assets/record-print-styles/_shared.css'
import '@/assets/record-print-styles/architecture.css'
import '@/assets/record-print-styles/warm.css'
import '@/assets/record-print-styles/spring.css'
import '@/assets/record-print-styles/simple.css'
import '@/assets/record-print-styles/modern.css'
import '@/assets/record-print-styles/classic.css'
import '@/assets/record-print-styles/ocean.css'
import '@/assets/record-print-styles/dusk.css'

/** @typedef {typeof warm} RecordPrintStyle */

/** @type {RecordPrintStyle[]} */
export const RECORD_PRINT_STYLES = [warm, spring, simple, modern, classic, ocean, dusk]

export const DEFAULT_RECORD_PRINT_STYLE_ID = warm.id

const STYLE_BY_ID = Object.fromEntries(RECORD_PRINT_STYLES.map((style) => [style.id, style]))

/** @deprecated Legacy id from before rename to warm. */
const LEGACY_STYLE_IDS = Object.freeze({ standard: 'warm' })

export function normalizeRecordPrintStyleId(raw) {
  const id = String(raw || '').trim()
  const migrated = LEGACY_STYLE_IDS[id] || id
  return STYLE_BY_ID[migrated] ? migrated : DEFAULT_RECORD_PRINT_STYLE_ID
}

/** @param {string} [styleId] @returns {RecordPrintStyle} */
export function getRecordPrintStyle(styleId) {
  return STYLE_BY_ID[normalizeRecordPrintStyleId(styleId)] || warm
}

export function getRecordPrintStyleCssVars(styleId) {
  return getRecordPrintStyle(styleId).cssVars
}
