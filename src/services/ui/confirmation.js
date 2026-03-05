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
  quickStartAnonymous: () => ({
    title: t('confirmation.quickStartAnonymous.title'),
    message: t('confirmation.quickStartAnonymous.message'),
    confirmText: t('confirmation.quickStartAnonymous.confirmText'),
    cancelText: t('confirmation.actions.cancel'),
    confirmClass: 'btn-confirm'
  }),

  discardChanges: () => ({
    title: t('confirmation.discardChanges.title'),
    message: t('confirmation.discardChanges.message'),
    confirmText: t('confirmation.discardChanges.confirmText'),
    cancelText: t('confirmation.actions.cancel'),
    confirmClass: 'btn-confirm-delete'
  }),

  addProjectChooseComponentType: () => ({
    title: t('confirmation.addProjectChooseComponentType.title'),
    message: t('confirmation.addProjectChooseComponentType.message'),
    cancelText: t('confirmation.actions.cancel')
  }),

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

  finishComponent: () => ({
    title: t('confirmation.finishComponent.title'),
    message: t('confirmation.finishComponent.message'),
    confirmText: t('confirmation.finishComponent.confirmText'),
    cancelText: t('confirmation.actions.cancel'),
    confirmClass: 'btn-confirm'
  }),

  finishRecord: () => ({
    title: t('confirmation.finishRecord.title'),
    message: t('confirmation.finishRecord.message'),
    confirmText: t('confirmation.finishRecord.confirmText'),
    cancelText: t('confirmation.actions.cancel'),
    confirmClass: 'btn-confirm'
  }),

  editResultAfterFinishRecord: () => ({
    title: t('confirmation.editResultAfterFinishRecord.title'),
    message: t('confirmation.editResultAfterFinishRecord.message'),
    confirmText: t('confirmation.actions.yes'),
    cancelText: t('confirmation.actions.no'),
    confirmClass: 'btn-confirm'
  }),

  restartRecord: () => ({
    title: t('confirmation.restartRecord.title'),
    message: t('confirmation.restartRecord.message'),
    confirmText: t('confirmation.restartRecord.confirmText'),
    cancelText: t('confirmation.actions.cancel'),
    confirmClass: 'btn-confirm-delete'
  }),

  startRecordingOnCompletedComponent: (params) => ({
    title: t('confirmation.startRecordingOnCompletedComponent.title'),
    message: t('confirmation.startRecordingOnCompletedComponent.message', {
      name: params?.name || ''
    }),
    confirmText: t('confirmation.startRecordingOnCompletedComponent.confirmText'),
    cancelText: t('confirmation.actions.cancel'),
    confirmClass: 'btn-confirm'
  }),

  startRecordingNotFirstIncompleteComponent: (params) => ({
    title: t('confirmation.startRecordingNotFirstIncompleteComponent.title'),
    message: t('confirmation.startRecordingNotFirstIncompleteComponent.message', {
      name: params?.name || '',
      first: params?.first || ''
    }),
    confirmText: t('confirmation.startRecordingNotFirstIncompleteComponent.confirmText'),
    cancelText: t('confirmation.actions.cancel'),
    confirmClass: 'btn-confirm'
  }),

  endAtBeforeCurrent: (params) => ({
    title: t('confirmation.endAtBeforeCurrent.title'),
    message: t('confirmation.endAtBeforeCurrent.message', {
      name: params?.name || '',
      fromRow: params?.fromRow ?? '',
      fromCrochet: params?.fromCrochet ?? '',
      toRow: params?.toRow ?? '',
      toCrochet: params?.toCrochet ?? ''
    }),
    confirmText: t('confirmation.endAtBeforeCurrent.confirmText'),
    cancelText: t('confirmation.actions.cancel'),
    confirmClass: 'btn-confirm'
  }),

  completeWholeRow: (params) => ({
    title: t('confirmation.completeWholeRow.title'),
    message: t('confirmation.completeWholeRow.message', {
      name: params?.name || '',
      row: params?.row ?? ''
    }),
    confirmText: t('confirmation.completeWholeRow.confirmText'),
    cancelText: t('confirmation.completeWholeRow.cancelText'),
    confirmClass: 'btn-confirm'
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
  choices: null,
  loading: DEFAULTS.loading,
  loadingText: DEFAULTS.loadingText
})

let pendingResolve = null
let activeOnConfirm = null
let activeOnCancel = null
let activeChoices = null

function cleanup() {
  pendingResolve = null
  activeOnConfirm = null
  activeOnCancel = null
  activeChoices = null
}

function resolveAndClose(result) {
  if (pendingResolve) pendingResolve(result)
  cleanup()
  state.show = false
  state.loading = false
  state.choices = null
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
  state.choices = null
  activeChoices = null

  activeOnConfirm = typeof options.onConfirm === 'function' ? options.onConfirm : null
  activeOnCancel = typeof options.onCancel === 'function' ? options.onCancel : null

  state.show = true

  return new Promise((resolve) => {
    pendingResolve = resolve
  })
}

function normalizeChoices(choices) {
  const arr = Array.isArray(choices) ? choices : []
  return arr
    .map((c) => ({
      id: c?.id != null ? String(c.id) : '',
      label: c?.label != null ? String(c.label) : '',
      class: c?.class ? String(c.class) : undefined
    }))
    .filter((c) => c.id && c.label)
}

/**
 * Opens a global confirmation modal with multiple action choices.
 * Resolves with the chosen choice id string, or null if canceled.
 */
export function openChoiceConfirmation(options = {}) {
  const presetOptions = resolvePresetOptions(options.type)
  const choices = normalizeChoices(options.choices)

  // If one is already open, cancel it.
  if (pendingResolve) {
    try {
      pendingResolve(null)
    } catch {
      // ignore
    }
    cleanup()
  }

  state.title = presetOptions.title ?? DEFAULTS.title
  state.loading = Boolean(options.loading)

  // confirm button is replaced by choices in the UI
  state.confirmText = presetOptions.confirmText ?? DEFAULTS.confirmText
  state.confirmClass = presetOptions.confirmClass ?? DEFAULTS.confirmClass

  state.choices = choices
  activeChoices = choices

  // For choice modals, confirm callbacks are not used.
  activeOnConfirm = null
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

  // If choices are active, ignore confirm button presses.
  if (Array.isArray(activeChoices) && activeChoices.length) return

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

export function chooseConfirmation(choiceId) {
  if (!pendingResolve) {
    state.show = false
    state.loading = false
    cleanup()
    return
  }

  const id = String(choiceId || '')
  const isValid = Array.isArray(activeChoices) && activeChoices.some((c) => c.id === id)
  if (!isValid) return

  resolveAndClose(id)
}

export function cancelConfirmation() {
  if (activeOnCancel) {
    try {
      activeOnCancel()
    } catch (error) {
      console.error('Confirmation onCancel failed:', error)
    }
  }
  const isChoice = Array.isArray(activeChoices) && activeChoices.length
  resolveAndClose(isChoice ? null : false)
}
