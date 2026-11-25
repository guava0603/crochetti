/**
 * Central feature toggles for shipping vs in-development UI.
 * Set a flag to `false` before release to hide unfinished features.
 *
 * Optional env override (build-time):
 * - VITE_ENABLE_RECORD_PRINT_STYLES=true|false
 */

const FLAG_DEFAULTS = Object.freeze({
  /** Bottom style picker on record print page (wallpaper / export themes). */
  recordPrintStylePicker: import.meta.env.DEV
})

const ENV_FLAG_KEYS = Object.freeze({
  recordPrintStylePicker: 'VITE_ENABLE_RECORD_PRINT_STYLES'
})

function readEnvBoolean(envKey) {
  const raw = import.meta.env?.[envKey]
  if (raw === undefined || raw === '') return undefined
  return raw !== 'false' && raw !== '0'
}

/** @param {keyof typeof FLAG_DEFAULTS} key */
export function isFeatureEnabled(key) {
  const envKey = ENV_FLAG_KEYS[key]
  if (envKey) {
    const fromEnv = readEnvBoolean(envKey)
    if (fromEnv !== undefined) return fromEnv
  }
  return Boolean(FLAG_DEFAULTS[key])
}

export const FEATURE_FLAGS = Object.freeze({
  get recordPrintStylePicker() {
    return isFeatureEnabled('recordPrintStylePicker')
  }
})
