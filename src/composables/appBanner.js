import { computed, inject, provide, reactive, readonly, toValue } from 'vue'

const APP_BANNER_KEY = Symbol('APP_BANNER')

/**
 * Provides a single global banner state for the app shell.
 *
 * Pages/layouts can update:
 * - title
 * - visible
 * - onBack (handler for back button)
 *
 * Back button visibility is driven by browser history (see useCanGoBack).
 * `showBack` in setBanner is kept for compatibility but not used by TopBanner.
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

/**
 * ThinIconButton background for banner controls (back, more menu).
 * Reads global banner variant so teleported menus still get glass styling.
 *
 * @param {import('vue').MaybeRefOrGetter<string>} [explicitBackground]
 */
export function useBannerThinIconBackground(explicitBackground = '') {
  const appBanner = useAppBanner()

  return computed(() => {
    const explicit = String(toValue(explicitBackground) || '').trim()
    if (explicit) return explicit

    const variant = String(appBanner?.state?.variant || 'default')
    const resolved = variant === 'glass' ? 'glass' : 'transparent'
    // #region agent log
    fetch('http://127.0.0.1:7900/ingest/ac6ceb27-9395-4309-8246-f894ce8ce241',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f2bc0'},body:JSON.stringify({sessionId:'7f2bc0',runId:'post-fix',location:'appBanner.js:useBannerThinIconBackground',message:'resolved banner icon background',data:{hasAppBanner:!!appBanner,variant,resolved,explicit},timestamp:Date.now(),hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return resolved
  })
}
