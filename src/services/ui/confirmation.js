import { reactive } from 'vue'
import { i18n } from '@/i18n'

function t(key, params) {
  try {
    return String(i18n?.global?.t?.(key, params) ?? key)
  } catch {
    return key
  }
}

function normalizeType(type) {
  if (typeof type === 'string') return { id: type, params: {} }
  if (!type || typeof type !== 'object') return { id: '', params: {} }
  const id = String(type.id || '')
  const params = type.params && typeof type.params === 'object' ? type.params : {}
  return { id, params }
}

const CONFIRMATION_PRESETS = {
  addProjectUnexpectedGenerate: (params) => ({
    title: t('confirmation.addProjectUnexpectedGenerate.title'),
    message: t('confirmation.addProjectUnexpectedGenerate.message', { rows: params.rows }),
    confirmText: t('confirmation.addProjectUnexpectedGenerate.confirmText'),
    cancelText: t('confirmation.actions.cancel'),
    confirmClass: 'btn-confirm'
  }),

  deleteRow: (params) => ({
    title: t('confirmation.deleteRow.title'),
    message: t('confirmation.deleteRow.message', { n: params.n }),
    confirmText: t('confirmation.actions.delete'),
    cancelText: t('confirmation.actions.cancel'),
    confirmClass: 'btn-confirm-delete'
  }),

  deleteItem: (params) => ({
    title: params.title || t('confirmation.deleteItem.title'),
    message:
      params.message ||
      t('confirmation.deleteItem.message'),
    confirmText: params.confirmText || t('confirmation.actions.delete'),
    cancelText: params.cancelText ?? t('confirmation.actions.cancel'),
    confirmClass: 'btn-confirm-delete',
    loadingText: params.loadingText || t('confirmation.deleteItem.loadingText')
  }),

  confirmUpdateTimeSlot: () => ({
    title: t('confirmation.confirmUpdateTimeSlot.title'),
    message: t('confirmation.confirmUpdateTimeSlot.message'),
    confirmText: t('confirmation.confirmUpdateTimeSlot.confirmText'),
    cancelText: t('confirmation.actions.cancel'),
    confirmClass: 'btn-confirm'
  }),

  deleteRecord: () => ({
    title: t('confirmation.deleteRecord.title'),
    message: t('confirmation.deleteRecord.message'),
    confirmText: t('confirmation.actions.delete'),
    cancelText: t('confirmation.actions.cancel'),
    confirmClass: 'btn-confirm-delete',
    loadingText: t('confirmation.deleteRecord.loadingText')
  }),

  deleteTimeSlot: () => ({
    title: t('confirmation.deleteTimeSlot.title'),
    message: t('confirmation.deleteTimeSlot.message'),
    confirmText: t('confirmation.actions.delete'),
    cancelText: t('confirmation.actions.cancel'),
    confirmClass: 'btn-confirm-delete',
    loadingText: t('confirmation.deleteTimeSlot.loadingText')
  }),

  removeComponent: (params) => ({
    title: t('confirmation.removeComponent.title'),
    message: t('confirmation.removeComponent.message', { name: params.name }),
    confirmText: t('confirmation.actions.delete'),
    cancelText: t('confirmation.actions.cancel'),
    confirmClass: 'btn-confirm-delete'
  }),

  logout: () => ({
    title: t('confirmation.logout.title'),
    message: t('confirmation.logout.message'),
    confirmText: t('confirmation.logout.confirmText'),
    cancelText: t('confirmation.actions.cancel'),
    loadingText: t('confirmation.logout.loadingText')
  }),

  deleteProject: (params) => ({
    title: t('confirmation.deleteProject.title'),
    message: t('confirmation.deleteProject.message', { name: params.name || '' }),
    confirmText: t('confirmation.actions.delete'),
    cancelText: t('confirmation.actions.cancel'),
    confirmClass: 'btn-confirm-delete',
    loadingText: t('confirmation.deleteProject.loadingText')
  }),

  deleteRows: (params) => ({
    title: t('confirmation.deleteRows.title', { start: params.start, end: params.end }),
    message: t('confirmation.deleteRows.message', { start: params.start, end: params.end }),
    confirmText: t('confirmation.actions.delete'),
    cancelText: t('confirmation.actions.cancel'),
    confirmClass: 'btn-confirm-delete'
  }),

  syncProject: () => ({
    title: t('confirmation.syncProject.title'),
    message: t('confirmation.syncProject.message').trim(),
    confirmText: t('confirmation.syncProject.confirmText'),
    cancelText: t('confirmation.actions.cancel'),
    confirmClass: 'btn-confirm',
    loadingText: t('confirmation.syncProject.loadingText')
  }),

  notice: (params) => ({
    title: params.title || t('confirmation.notice.title'),
    message: params.message || '',
    confirmText: params.confirmText || t('confirmation.actions.ok'),
    cancelText: ''
  }),

  error: (params) => ({
    title: params.title || t('confirmation.error.title'),
    message: params.message || '',
    confirmText: params.confirmText || t('confirmation.actions.ok'),
    cancelText: ''
  })
}

function resolvePresetOptions(type) {
  const { id, params } = normalizeType(type)
  const preset = CONFIRMATION_PRESETS[id]
  if (!preset) {
    console.warn('Unknown confirmation type:', id)
    return {}
  }
  return typeof preset === 'function' ? preset(params) : (preset || {})
}

function getDefaults() {
  return {
    title: t('confirmation.defaults.title'),
    message: '',
    confirmText: t('confirmation.defaults.confirmText'),
    cancelText: t('confirmation.defaults.cancelText'),
    confirmClass: 'btn-confirm',
    loading: false,
    loadingText: t('confirmation.defaults.loadingText')
  }
}

const DEFAULTS = getDefaults()

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
 * - await openConfirmation({ type: 'logout', onConfirm: async () => {} })
 * - await openConfirmation({ type: { id: 'deleteRow', params: { n: 3 } }, onConfirm: async () => {} })
 */
export function openConfirmation(options = {}) {
  const presetOptions = resolvePresetOptions(options.type)

  // If one is already open, cancel it.
  if (pendingResolve) {
    try {
      pendingResolve(false)
    } catch {
      // ignore
    }
    cleanup()
  }

  state.title = presetOptions.title ?? DEFAULTS.title
  state.message = presetOptions.message ?? DEFAULTS.message
  state.confirmText = presetOptions.confirmText ?? DEFAULTS.confirmText
  state.cancelText = presetOptions.cancelText ?? DEFAULTS.cancelText
  state.confirmClass = presetOptions.confirmClass ?? DEFAULTS.confirmClass
  state.loadingText = presetOptions.loadingText ?? DEFAULTS.loadingText
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
