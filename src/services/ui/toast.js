import { reactive } from 'vue'

const state = reactive({
  show: false,
  message: '',
  _timer: null
})

export function useToastState() {
  return state
}

export function openToast({ message = '', duration = 1600 } = {}) {
  if (state._timer) {
    clearTimeout(state._timer)
    state._timer = null
  }

  state.message = String(message || '')
  state.show = true

  state._timer = setTimeout(() => {
    state.show = false
    state._timer = null
  }, Math.max(300, Number(duration) || 0))
}

export function closeToast() {
  if (state._timer) {
    clearTimeout(state._timer)
    state._timer = null
  }
  state.show = false
}
