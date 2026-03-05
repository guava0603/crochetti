import { reactive } from 'vue'
import { HELP_TOPICS } from '@/help'

const state = reactive({
  show: false,
  topicId: '',
  pageIndex: 0,
  props: null
})

export function useHelpState() {
  return state
}

export function openHelp(topicId, props = null) {
  const id = String(topicId || '').trim()
  if (!id) return false
  const topic = HELP_TOPICS?.[id]
  const pages = Array.isArray(topic?.pages) ? topic.pages : []
  if (pages.length === 0) return false

  state.show = true
  state.topicId = id
  state.pageIndex = 0
  state.props = props && typeof props === 'object' ? props : null
  return true
}

// Convenience alias (matches the "global help function" request)
export function help(topicId, props = null) {
  return openHelp(topicId, props)
}

export function closeHelp() {
  state.show = false
  state.topicId = ''
  state.pageIndex = 0
  state.props = null
}

export function goHelpPage(nextIndex) {
  const topic = HELP_TOPICS?.[state.topicId]
  const pages = Array.isArray(topic?.pages) ? topic.pages : []
  if (pages.length === 0) return

  const idx = Number(nextIndex)
  if (!Number.isFinite(idx)) return

  state.pageIndex = Math.min(pages.length - 1, Math.max(0, idx))
}

export function nextHelpPage() {
  const topic = HELP_TOPICS?.[state.topicId]
  const pages = Array.isArray(topic?.pages) ? topic.pages : []
  if (pages.length === 0) {
    closeHelp()
    return
  }

  const next = state.pageIndex + 1
  if (next >= pages.length) {
    closeHelp()
    return
  }

  state.pageIndex = next
}
