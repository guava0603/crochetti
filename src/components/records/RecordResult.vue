<template>
  <div class="record-result-view" :class="{ 'is-capturing': isCapturing }">
    <div ref="pageContentEl" class="page-content">
      <div v-if="loading" class="result-empty">
        {{ t('common.loading') }}
      </div>

      <div v-else-if="rankedGroups.length === 0" class="result-empty">
        {{ t('record.noTimeSlots') }}
      </div>

      <div v-else class="result-body">
        <button
          class="result-share-btn result-share-btn--floating"
          type="button"
          aria-label="Share"
          title="Share / Download"
          :disabled="isCapturing"
          @click="shareOrDownload"
        >
          <img class="result-share-btn__icon" :src="uploadIconUrl" alt="" aria-hidden="true" />
        </button>

        <div v-if="showSummary" class="result-summary">
          <div class="summary-line">{{ t('recordResult.spanLine', { span: spanText }) }}</div>
          <div class="summary-line">
            <span>{{ effortLineParts.before }}</span><span class="summary-highlight">{{ effortText }}</span><span>{{ effortLineParts.after }}</span>
          </div>
        </div>
        <div class="result-header">
          <h2 class="result-title">{{ t('recordResult.title') }}</h2>
        </div>
        <div class="top-card">
          <div class="top-badge" aria-hidden="true">
            <div class="top-badge__circle" />
            <ProgressRing
              class="top-badge__ring"
              :value="topGroupPercent"
              :size="188"
              :stroke="14"
              :show-percent-number="false"
              track-color="rgba(17, 24, 39, 0.08)"
            />
            <div class="top-badge__content">
              <div class="top-badge__title">{{ rankedGroups[0].label }}</div>
              <div class="top-badge__sub">{{ formatDuration(rankedGroups[0].durationMs) }}</div>
            </div>
          </div>
          <div class="top-card-metrics">
            <div class="metric">
              <div v-if="topGroupNoteLines.length" class="metric-note-chart-wrap">
                <BarChart
                  class="metric-note-chart"
                  :values="topGroupNotePercents"
                  :titles="topGroupNoteTitles"
                  :value-labels="topGroupNoteValueLabels"
                  orientation="horizontal"
                  :show-labels="true"
                  :show-value-label="true"
                  :bar-width="12"
                  :gap="10"
                />
              </div>
            </div>
          </div>
        </div>

        <template v-if="rankedGroups.length > 1">
          <div class="rest-title">{{ t('recordResult.nextStatuses') }}</div>
          <div class="rest-grid">
            <div v-for="g in rankedGroups.slice(1, 5)" :key="g.key" class="rest-card">
              <div
                class="rest-card-header"
                role="button"
                tabindex="0"
                :aria-expanded="isRestExpanded(g.key)"
                @click="toggleRestExpanded(g.key)"
                @keydown.enter.prevent="toggleRestExpanded(g.key)"
                @keydown.space.prevent="toggleRestExpanded(g.key)"
              >
                <div class="rest-card-start">
                  <ProgressRing
                    class="rest-card-ring"
                    :value="getGroupPercent(g)"
                    :size="40"
                    :stroke="6"
                    :show-percent-number="false"
                  />
                  <div class="rest-card-title">{{ g.label }}</div>
                </div>
                <div class="rest-card-sub">{{ formatDuration(g.durationMs) }}</div>
              </div>

              <div v-if="isRestExpanded(g.key)" class="rest-card-details" @click.stop>
                <BarChart
                  v-if="getGroupNoteLines(g).length"
                  class="rest-card-details-chart"
                  orientation="horizontal"
                  :show-labels="true"
                  :show-value-label="true"
                  :values="getGroupNoteLines(g).map(l => l.percent)"
                  :titles="getGroupNoteLines(g).map(l => l.note)"
                  :value-labels="getGroupNoteLines(g).map(l => formatDuration(l.durationMs))"
                  :bar-width="10"
                  :gap="10"
                />
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { onAuthStateChanged } from 'firebase/auth'
import html2canvas from 'html2canvas'
import { auth } from '@/firebaseConfig'
import { fetchUserRecord } from '@/services/firestore/records'
import { originalStatuses } from '@/constants/status.js'
import { useRecordContext } from '@/composables/recordContext'
import ProgressRing from '@/components/ui/ProgressRing.vue'
import BarChart from '@/components/ui/BarChart.vue'

const route = useRoute()
const { t } = useI18n({ useScope: 'global' })

const baseUrl = import.meta.env.BASE_URL || '/'
const uploadIconUrl = `${baseUrl}assets/image/settings/028__upload.svg`

const pageContentEl = ref(null)
const isCapturing = ref(false)

const recordCtx = useRecordContext()

const recordId = recordCtx?.recordId || ref(route.params.record_id)
const currentRecord = recordCtx?.recordData || ref(null)
const currentUser = ref(null)
const currentTime = ref(Date.now())
const loading = recordCtx?.recordLoading || ref(true)

let timerInterval = null

const timeSlots = computed(() => {
  const slots = currentRecord.value?.time_slots
  return Array.isArray(slots) ? slots : []
})

const parseIsoToMs = (iso) => {
  if (!iso) return null
  const ms = new Date(iso).getTime()
  return Number.isFinite(ms) ? ms : null
}

const earliestStartMs = computed(() => {
  let earliest = null
  for (const slot of timeSlots.value) {
    const ms = parseIsoToMs(slot?.start)
    if (ms == null) continue
    if (earliest == null || ms < earliest) earliest = ms
  }
  return earliest
})

const latestEndMs = computed(() => {
  let latest = null
  for (const slot of timeSlots.value) {
    const endIso = slot?.end || null
    const ms = endIso ? parseIsoToMs(endIso) : currentTime.value
    if (ms == null || !Number.isFinite(ms)) continue
    if (latest == null || ms > latest) latest = ms
  }
  return latest
})

const recordSpanMs = computed(() => {
  if (earliestStartMs.value == null || latestEndMs.value == null) return null
  return Math.max(0, latestEndMs.value - earliestStartMs.value)
})

const totalEffortMs = computed(() => {
  let sum = 0
  for (const slot of timeSlots.value) sum += getSlotDurationMs(slot)
  return sum
})

const getStatusLabel = (statusId) => {
  if (statusId == null) return '-'

  const original = originalStatuses.find(s => Number(s?.id) === Number(statusId))
  if (original?.nameKey) return t(original.nameKey)

  const custom = (currentRecord.value?.self_defined_status || []).find(s => Number(s?.id) === Number(statusId))
  if (custom?.name) return String(custom.name)

  return String(statusId)
}

const getSlotDurationMs = (slot) => {
  const startIso = slot?.start
  if (!startIso) return 0
  const startMs = new Date(startIso).getTime()
  if (!Number.isFinite(startMs)) return 0

  const endMs = slot?.end ? new Date(slot.end).getTime() : currentTime.value
  if (!Number.isFinite(endMs)) return 0

  return Math.max(0, endMs - startMs)
}

const getGroupPercent = (group) => {
  const total = totalEffortMs.value
  if (!Number.isFinite(total) || total <= 0) return 0
  const part = Number(group?.durationMs)
  if (!Number.isFinite(part) || part <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)))
}

const rankedGroups = computed(() => {
  const byKey = new Map()

  for (const slot of timeSlots.value) {
    const statusId = slot?.status_id ?? null
    const key = statusId == null ? '__none__' : String(statusId)
    const durationMs = getSlotDurationMs(slot)

    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        statusId,
        label: getStatusLabel(statusId),
        durationMs: 0,
        count: 0
      })
    }

    const group = byKey.get(key)
    group.durationMs += durationMs
    group.count += 1
  }

  return Array.from(byKey.values())
    .filter(g => g.durationMs > 0 || g.count > 0)
    .sort((a, b) => b.durationMs - a.durationMs)
})

const topGroup = computed(() => rankedGroups.value?.[0] || null)

const topGroupPercent = computed(() => {
  if (!topGroup.value) return 0
  return getGroupPercent(topGroup.value)
})

const topGroupNoteLines = computed(() => {
  const group = topGroup.value
  if (!group) return []
  if (!group.durationMs || group.durationMs <= 0) return []

  const totalsByNote = new Map()

  for (const slot of timeSlots.value) {
    const statusId = slot?.status_id ?? null
    const sameStatus = statusId == null
      ? group.statusId == null
      : Number(statusId) === Number(group.statusId)

    if (!sameStatus) continue

    const noteRaw = slot?.status_note
    const note = typeof noteRaw === 'string' ? noteRaw.trim() : ''
    if (!note) continue

    const durationMs = getSlotDurationMs(slot)
    if (durationMs <= 0) continue

    totalsByNote.set(note, (totalsByNote.get(note) || 0) + durationMs)
  }

  const lines = Array.from(totalsByNote.entries())
    .map(([note, durationMs]) => {
      const percent = Math.max(0, Math.min(100, Math.round((durationMs / group.durationMs) * 100)))
      return { key: note, note, percent, durationMs }
    })
    .filter(l => l.percent > 0)
    .sort((a, b) => b.percent - a.percent)

  return lines
})

const topGroupNotePercents = computed(() => topGroupNoteLines.value.map(l => l.percent))

const topGroupNoteTitles = computed(() => {
  return topGroupNoteLines.value.map(line => line.note)
})

const topGroupNoteValueLabels = computed(() => {
  return topGroupNoteLines.value.map(line => formatDuration(line.durationMs))
})

const expandedRestKeys = ref(new Set())

const normalizeGroupKey = (key) => (key == null ? null : String(key))

const isRestExpanded = (key) => {
  const k = normalizeGroupKey(key)
  if (!k) return false
  return expandedRestKeys.value.has(k)
}

const toggleRestExpanded = (key) => {
  const k = normalizeGroupKey(key)
  if (!k) return

  const next = new Set(expandedRestKeys.value)
  if (next.has(k)) next.delete(k)
  else next.add(k)
  expandedRestKeys.value = next
}

const groupNoteLinesByKey = computed(() => {
  const groupTotals = new Map()
  const notesByGroup = new Map()

  for (const slot of timeSlots.value) {
    const statusId = slot?.status_id ?? null
    const groupKey = statusId == null ? '__none__' : String(statusId)
    const durationMs = getSlotDurationMs(slot)
    if (durationMs <= 0) continue

    groupTotals.set(groupKey, (groupTotals.get(groupKey) || 0) + durationMs)

    const noteRaw = slot?.status_note
    const note = typeof noteRaw === 'string' ? noteRaw.trim() : ''
    if (!note) continue

    if (!notesByGroup.has(groupKey)) notesByGroup.set(groupKey, new Map())
    const byNote = notesByGroup.get(groupKey)
    byNote.set(note, (byNote.get(note) || 0) + durationMs)
  }

  const result = new Map()
  for (const [groupKey, byNote] of notesByGroup.entries()) {
    const total = groupTotals.get(groupKey) || 0
    if (!total || total <= 0) {
      result.set(groupKey, [])
      continue
    }

    const lines = Array.from(byNote.entries())
      .map(([note, durationMs]) => {
        const percent = Math.max(0, Math.min(100, Math.round((durationMs / total) * 100)))
        return { key: note, note, durationMs, percent }
      })
      .filter(l => l.durationMs > 0)
      .sort((a, b) => b.durationMs - a.durationMs)

    result.set(groupKey, lines)
  }

  return result
})

const getGroupNoteLines = (group) => {
  const statusId = group?.statusId ?? null
  const groupKey = statusId == null ? '__none__' : String(statusId)
  return groupNoteLinesByKey.value.get(groupKey) || []
}

const formatDuration = (ms) => {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000)

  if (totalSeconds < 60) {
    return t('recordResult.durationSecond', { n: totalSeconds })
  }

  const totalMinutes = Math.floor(totalSeconds / 60)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  const parts = []
  if (days > 0) parts.push(t('recordResult.durationDay', { n: days }))
  if (hours > 0) parts.push(t('recordResult.durationHour', { n: hours }))
  if (minutes > 0) parts.push(t('recordResult.durationMinute', { n: minutes }))

  return parts.join(t('recordResult.durationJoiner'))
}

const splitI18nLine = (key, paramName) => {
  const token = `__${String(paramName).toUpperCase()}__`
  const msg = t(key, { [paramName]: token })
  const idx = msg.indexOf(token)

  if (idx === -1) {
    return { before: msg, after: '' }
  }

  return {
    before: msg.slice(0, idx),
    after: msg.slice(idx + token.length)
  }
}

const spanText = computed(() => {
  if (recordSpanMs.value == null) return '-'
  return formatDuration(recordSpanMs.value)
})

const effortText = computed(() => formatDuration(totalEffortMs.value))

const effortLineParts = computed(() => splitI18nLine('recordResult.effortLine', 'effort'))

const showSummary = computed(() => !loading.value && timeSlots.value.length > 0 && recordSpanMs.value != null)

const buildShareText = () => {
  const lines = []
  lines.push(t('recordResult.title'))

  const top = rankedGroups.value?.[0]
  if (top) {
    lines.push(`${top.label}: ${formatDuration(top.durationMs)}`)
  }

  if (showSummary.value) {
    lines.push(t('recordResult.spanLine', { span: spanText.value }))
    lines.push(t('recordResult.effortLine', { effort: effortText.value }))
  }

  return lines.filter(Boolean).join('\n')
}

const capturePageContentPngBlob = async () => {
  const el = pageContentEl.value
  if (!el) throw new Error('page-content element not found')

  const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1
  const scale = Math.max(1, Math.min(2, dpr))

  const canvas = await html2canvas(el, {
    backgroundColor: '#ffffff',
    scale,
    useCORS: true,
    logging: false
  })

  const blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png')
  })

  if (!blob) throw new Error('Failed to create PNG blob')
  return blob
}

const downloadText = (filename, text) => {
  const blob = new Blob([String(text || '')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const shareOrDownload = async () => {
  const title = t('recordResult.title')
  const safeId = recordId.value ? String(recordId.value).replace(/[^a-zA-Z0-9_-]+/g, '-') : 'record'
  const filename = `record-result-${safeId}.png`

  try {
    isCapturing.value = true
    await nextTick()

    const blob = await capturePageContentPngBlob()
    const file = new File([blob], filename, { type: 'image/png' })

    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title, files: [file] })
        return
      }
    } catch {
      // ignore and fall back to download
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch {
    // As a last resort, fall back to text download.
    const text = buildShareText()
    downloadText(`record-result-${safeId}.txt`, text)
  } finally {
    isCapturing.value = false
  }
}

const loadRecord = async () => {
  if (recordCtx) {
    await recordCtx.loadRecord()
    return
  }

  if (!currentUser.value || !recordId.value) return
  const recordData = await fetchUserRecord(currentUser.value.uid, recordId.value)
  currentRecord.value = recordData || null
}

onMounted(() => {
  if (recordCtx) {
    loadRecord()
    timerInterval = setInterval(() => {
      currentTime.value = Date.now()
    }, 1000)
    return
  }

  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    currentUser.value = user || null
    loading.value = true

    try {
      if (user) {
        await loadRecord()
        timerInterval = setInterval(() => {
          currentTime.value = Date.now()
        }, 1000)
      }
    } finally {
      loading.value = false
      unsubscribe()
    }
  })
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<style scoped>
.record-result-view {
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
}

.page-content {
  padding: 0.5rem 0 3rem;
  background: unset;
}

.result-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 900;
  color: #111827;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.result-share-btn {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(17, 24, 39, 0.14);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0px 1px 6px -4px rgba(0,0,0,0.45);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: transform 0.08s ease, background 0.15s ease, border-color 0.15s ease;
}

.result-share-btn--floating {
  position: fixed;
  top: calc(6rem + env(safe-area-inset-top, 0px));
  right: calc(0.75rem + env(safe-area-inset-right, 0px));
  z-index: 30;
}

.result-share-btn:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(17, 24, 39, 0.22);
}

.result-share-btn:active {
  transform: translateY(1px);
}

.result-share-btn__icon {
  width: 20px;
  height: 20px;
  opacity: 0.85;
}

.record-result-view.is-capturing .result-share-btn--floating {
  opacity: 0;
  pointer-events: none;
}

.result-share-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.result-actions {
  margin-top: 0.75rem;
  display: flex;
  justify-content: flex-end;
}

.btn-more-details {
  border: 1px solid rgba(66, 185, 131, 0.35);
  background: rgba(66, 185, 131, 0.12);
  color: #0f5132;
  border-radius: 10px;
  padding: 0.6rem 1rem;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.15s, transform 0.05s, opacity 0.15s;
}

.btn-more-details:hover {
  background: rgba(66, 185, 131, 0.18);
}

.btn-more-details:active {
  transform: translateY(1px);
}

.result-summary {
  margin: 0 0 1.5rem 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.summary-line {
  line-height: 1.2;
  margin: 0;
  padding: 0.5rem 0.0;
  color: var(--color-font-invisible);
  font-weight: 800;
  font-size: 0.85rem;
  letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums;
}

.summary-line > span {
  color: var(--color-font-invisible);
  font-weight: 800;
  font-size: 0.85rem;
  letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums;
}

.summary-highlight {
  display: inline;
  padding: 0.05em 0.18em;
  color: rgba(17, 24, 39, 0.78);
  font-weight: 950;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
  border-radius: 6px;
  background:
    linear-gradient(
      to bottom,
      transparent 38%,
      var(--color-highlight-yellow) 38%,
      var(--color-highlight-yellow) 92%,
      transparent 92%
    ),
    linear-gradient(
      to bottom,
      transparent 52%,
      rgba(255, 214, 64, 0.55) 52%,
      rgba(255, 214, 64, 0.55) 88%,
      transparent 88%
    );
  box-shadow:
    0 0.02em 0 rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(255, 214, 64, 0.16) inset;
}

.result-empty {
  margin-top: 0.75rem;
  color: #6b7280;
  font-weight: 700;
}

.result-body {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.top-card {
  position: relative;
  padding: 6.25rem 0.6rem 1rem;
  background: white;
  border-radius: 1rem;
  margin-top: 4rem;
}

.top-badge {
  position: absolute;
  left: 50%;
  top: -3.25rem;
  transform: translateX(-50%);
  width: 188px;
  height: 188px;
  z-index: 2;
}

.top-badge__circle {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0px 1px 6px -3px rgba(0,0,0,0.49);
}

.top-badge__ring {
  position: absolute;
  inset: 0;
}

.top-badge__content {
  position: absolute;
  inset: 14px;
  border-radius: 999px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0.75rem;
}

.top-badge__title {
  font-weight: 950;
  color: #111827;
  font-size: 1.85rem;
  line-height: 1.05;
  white-space: nowrap;
  text-align: center;
  width: 100%;
  min-width: fit-content;
}

.top-badge__sub {
  margin-top: 0.35rem;
  font-weight: 800;
  font-size: 0.95rem;
  color: rgba(17, 24, 39, 0.55);
  font-variant-numeric: tabular-nums;
}

.top-card-metrics {
  margin-top: 2.75rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.75rem;
}

.metric {
  background: #fff;
  /* border: 1px solid #e5e7eb; */
  border-radius: 14px;
  padding: 1.5rem 1rem;
  /* border: 1px solid rgba(66, 185, 131, 0.35); */
}

.metric-value {
  font-weight: 900;
  font-size: 1.15rem;
  color: #111827;
}

.metric-label {
  margin-bottom: 0.3rem;
  font-weight: 800;
  font-size: 1rem;
  color: #6b7280;
  text-align: center;
}

.metric-note-chart-wrap {
  display: flex;
  justify-content: stretch;
  width: 100%;
  padding: 0.25rem 0;
}

.metric-note-chart {
  width: 100%;
}

.rest-title {
  font-weight: 900;
  color: #111827;
  margin-top: 2rem;
}

.rest-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}

.rest-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.6rem;
  cursor: pointer;
  border-radius: 14px;
}

.rest-card-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  outline: none;
}

.rest-card-header:focus-visible {
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.22);
  border-radius: 12px;
}

.rest-card-start {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.rest-card-ring {
  flex: none;
}

.rest-card-title {
  font-weight: 900;
  color: #111827;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rest-card-sub {
  font-weight: 700;
  color: var(--color-font-invisible);
  display: flex;
  gap: 0.35rem;
}

.rest-card-details {
  padding-top: 0.25rem;
}

.rest-card-details-chart {
  width: 100%;
}

.dot {
  color: #6b7280;
}

.more-hint {
  color: #6b7280;
  font-weight: 800;
}
</style>
