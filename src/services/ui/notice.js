import { openConfirmation } from './confirmation'

export function openNotice({ title = 'Notice', message = '', confirmText = 'OK' } = {}) {
  return openConfirmation({
    type: { id: 'notice', params: { title, message, confirmText } }
  })
}

export function openError({ title = 'Error', message = '', confirmText = 'OK' } = {}) {
  return openConfirmation({
    type: { id: 'error', params: { title, message, confirmText } }
  })
}
