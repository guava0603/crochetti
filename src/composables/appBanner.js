import { inject, provide, reactive, readonly } from 'vue'

const APP_BANNER_KEY = Symbol('APP_BANNER')

/**
 * Provides a single global banner state for the app shell.
 *
 * Pages/layouts can update:
 * - title
 * - showBack
 * - visible
 * - onBack (handler for back button)
 *
 * App.vue should reset `onBack` (and optionally title/showBack) on route changes
 * to avoid stale handlers.
 */
export function provideAppBanner() {
  const state = reactive({
    visible: true,
    /** @type {'default' | 'glass'} */
    variant: 'default',
    title: '',
    showBack: true,
    overlay: false,
    transparent: false,
    /** @type {null | (() => void | Promise<void>)} */
    onBack: null
  })

  /** @param {{visible?: boolean, variant?: 'default' | 'glass' | string, title?: string, showBack?: boolean, overlay?: boolean, transparent?: boolean, onBack?: null | (() => void | Promise<void>)}} partial */
  function setBanner(partial) {
    if (!partial || typeof partial !== 'object') return
    if ('visible' in partial) state.visible = Boolean(partial.visible)
    if ('variant' in partial) state.variant = String(partial.variant || 'default')
    if ('title' in partial) state.title = String(partial.title || '')
    if ('showBack' in partial) state.showBack = Boolean(partial.showBack)
    if ('overlay' in partial) state.overlay = Boolean(partial.overlay)
    if ('transparent' in partial) state.transparent = Boolean(partial.transparent)
    if ('onBack' in partial) state.onBack = partial.onBack || null
  }

  function resetHandlers() {
    state.onBack = null
  }

  provide(APP_BANNER_KEY, {
    state: readonly(state),
    setBanner,
    resetHandlers
  })

  return { state, setBanner, resetHandlers }
}

export function useAppBanner() {
  return inject(APP_BANNER_KEY, null)
}
