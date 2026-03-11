import { inject, provide, reactive, readonly } from 'vue'

const FOOTER_CONTEXT_KEY = Symbol('footerContext')

export function provideFooterContext() {
  const state = reactive({
    actions: null
  })

  function setActions(next) {
    state.actions = next && typeof next === 'object' ? next : null
  }

  function clearActions() {
    state.actions = null
  }

  const api = {
    state: readonly(state),
    setActions,
    clearActions
  }

  provide(FOOTER_CONTEXT_KEY, api)
  return api
}

export function useFooterContext() {
  const ctx = inject(FOOTER_CONTEXT_KEY, null)
  if (!ctx) {
    throw new Error('useFooterContext must be used under provideFooterContext')
  }
  return ctx
}
