import { reactive } from 'vue'

const DEFAULTS = {
  title: 'Confirm',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  confirmClass: 'btn-confirm',
  loading: false,
  loadingText: 'Processing...'
}

const state = reactive({
  show: false,
  title: DEFAULTS.title,
  message: DEFAULTS.message,
  confirmText: DEFAULTS.confirmText,
  cancelText: DEFAULTS.cancelText,
  confirmClass: DEFAULTS.confirmClass,
  loading: DEFAULTS.loading,
  loadingText: DEFAULTS.loadingText
})

let pendingResolve = null
let activeOnConfirm = null
let activeOnCancel = null

function cleanup() {
  pendingResolve = null
  activeOnConfirm = null
  activeOnCancel = null
}

function resolveAndClose(result) {
  if (pendingResolve) pendingResolve(result)
  cleanup()
  state.show = false
  state.loading = false
}

export function useConfirmationState() {
  return state
}

/**
 * Opens a global confirmation modal.
 *
 * Usage:
 * - await openConfirmation('Are you sure?')
 * - await openConfirmation({ title, message, confirmText, cancelText, confirmClass, loadingText, onConfirm })
 */
export function openConfirmation(messageOrOptions) {
  const options =
    typeof messageOrOptions === 'string'
      ? { message: messageOrOptions }
      : (messageOrOptions || {})

  // If one is already open, cancel it.
  if (pendingResolve) {
    try {
      pendingResolve(false)
    } catch {
      // ignore
    }
    cleanup()
  }

  state.title = options.title ?? DEFAULTS.title
  state.message = options.message ?? DEFAULTS.message
  state.confirmText = options.confirmText ?? DEFAULTS.confirmText
  state.cancelText = options.cancelText ?? DEFAULTS.cancelText
  state.confirmClass = options.confirmClass ?? DEFAULTS.confirmClass
  state.loadingText = options.loadingText ?? DEFAULTS.loadingText
  state.loading = Boolean(options.loading)

  activeOnConfirm = typeof options.onConfirm === 'function' ? options.onConfirm : null
  activeOnCancel = typeof options.onCancel === 'function' ? options.onCancel : null

  state.show = true

  return new Promise((resolve) => {
    pendingResolve = resolve
  })
}

export async function confirmConfirmation() {
  if (!pendingResolve) {
    state.show = false
    state.loading = false
    cleanup()
    return
  }

  if (!activeOnConfirm) {
    resolveAndClose(true)
    return
  }

  state.loading = true
  try {
    await activeOnConfirm()
    resolveAndClose(true)
  } catch (error) {
    console.error('Confirmation onConfirm failed:', error)
    state.loading = false
  }
}

export function cancelConfirmation() {
  if (activeOnCancel) {
    try {
      activeOnCancel()
    } catch (error) {
      console.error('Confirmation onCancel failed:', error)
    }
  }
  resolveAndClose(false)
}
