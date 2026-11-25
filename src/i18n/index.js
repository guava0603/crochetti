import { createI18n } from 'vue-i18n'

import en from '@/locales/en.json'
import zhTW from '@/locales/zh-TW.json'

// Device-only UI language. See docs/data-model.md §11.
const STORAGE_KEY = 'corchetti.locale'

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'zh-TW', label: '繁體中文' }
]

function normalizeLocale(raw) {
  if (!raw) return null
  const value = String(raw)
  if (value === 'en') return 'en'
  if (value === 'zh' || value.toLowerCase() === 'zh-tw' || value === 'zh-TW') return 'zh-TW'
  return null
}

function detectInitialLocale() {
  const fromStorage = normalizeLocale(localStorage.getItem(STORAGE_KEY))
  if (fromStorage) {
    const stored = String(localStorage.getItem(STORAGE_KEY) || '')
    if (stored && stored !== fromStorage) setStoredLocale(fromStorage)
    return fromStorage
  }

  const nav = normalizeLocale(navigator.language)
  if (nav) return nav

  return 'en'
}

export function setStoredLocale(locale) {
  localStorage.setItem(STORAGE_KEY, locale)
}

export function getStoredLocale() {
  return normalizeLocale(localStorage.getItem(STORAGE_KEY))
}

const initialLocale = detectInitialLocale()

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: initialLocale,
  fallbackLocale: {
    'zh-TW': ['zh', 'en'],
    zh: ['zh-TW', 'en'],
    en: []
  },
  messages: {
    en,
    'zh-TW': zhTW,
    // Intlify language-fallback resolves `zh` from `zh-TW`; alias avoids missing-key warnings.
    zh: zhTW
  }
})

if (normalizeLocale(i18n.global.locale.value) !== i18n.global.locale.value) {
  i18n.global.locale.value = initialLocale
}

export function setI18nLocale(locale) {
  const normalized = normalizeLocale(locale)
  if (!normalized) return

  i18n.global.locale.value = normalized
  setStoredLocale(normalized)
}
