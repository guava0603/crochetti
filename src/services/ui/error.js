import { reactive } from 'vue'

const state = reactive({
  show: false,
  title: '',
  message: '',
  duration: 4200,
  _timer: null
})

export function useErrorState() {
  return state
}

export function openError({ title = '', message = '', duration = 4200 } = {}) {
  if (state._timer) {
    clearTimeout(state._timer)
    state._timer = null
  }

  state.title = String(title || '')
  state.message = String(message || '')
  state.duration = Math.max(0, Number(duration) || 0)
  state.show = Boolean(state.message || state.title)

  if (!state.show) return

  if (state.duration > 0) {
    state._timer = setTimeout(() => {
      state.show = false
      state._timer = null
    }, state.duration)
  }
}

export function closeError() {
  if (state._timer) {
    clearTimeout(state._timer)
    state._timer = null
  }
  state.show = false
}
