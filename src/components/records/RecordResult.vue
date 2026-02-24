<template>
  <div class="record-result-view">
    <div class="page-content">
      <div v-if="showSummary" class="result-summary">
        <div class="summary-line">{{ t('recordResult.spanLine', { span: spanText }) }}</div>
        <div class="summary-line">{{ t('recordResult.effortLine', { effort: effortText }) }}</div>
      </div>
      <h2 class="result-title">{{ t('recordResult.title') }}</h2>

      <div class="result-actions">
        <button type="button" class="btn-more-details" @click="goTimeSlots">
          {{ t('record.moreDetails') }}
        </button>
      </div>

      <div v-if="loading" class="result-empty">
        {{ t('common.loading') }}
      </div>

      <div v-else-if="rankedGroups.length === 0" class="result-empty">
        {{ t('record.noTimeSlots') }}
      </div>

      <div v-else class="result-body">
        <div class="top-card">
          <div class="top-card-header">
            <div class="top-card-title">{{ rankedGroups[0].label }}</div>
          </div>
          <div class="top-card-metrics">
            <div class="metric-label">
              {{ t('recordResult.totalDuration', { duration: formatDuration(rankedGroups[0].durationMs) }) }}
            </div>
            <div class="metric">
              <div v-if="topGroupNoteLines.length" class="metric-note-lines">
                <div v-for="line in topGroupNoteLines" :key="line.key" class="metric-note-line">
                  {{ t('recordResult.includesItemLine', { p: line.percent, note: line.note }) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="rest-title">{{ t('recordResult.nextStatuses') }}</div>
        <div class="rest-grid">
          <div v-for="g in rankedGroups.slice(1, 5)" :key="g.key" class="rest-card">
            <div class="rest-card-title">{{ g.label }}</div>
            <div class="rest-card-sub">{{ formatDuration(g.durationMs) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebaseConfig'
import { fetchUserRecord } from '@/services/firestore/records'
import { originalStatuses } from '@/constants/status.js'
import { useRecordContext } from '@/composables/recordContext'

const route = useRoute()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })

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
      return { key: note, note, percent }
    })
    .filter(l => l.percent > 0)
    .sort((a, b) => b.percent - a.percent)

  return lines
})

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

const spanText = computed(() => {
  if (recordSpanMs.value == null) return '-'
  return formatDuration(recordSpanMs.value)
})

const effortText = computed(() => formatDuration(totalEffortMs.value))

const showSummary = computed(() => !loading.value && timeSlots.value.length > 0 && recordSpanMs.value != null)

const loadRecord = async () => {
  if (recordCtx) {
    await recordCtx.loadRecord()
    return
  }

  if (!currentUser.value || !recordId.value) return
  const recordData = await fetchUserRecord(currentUser.value.uid, recordId.value)
  currentRecord.value = recordData || null
}

const goTimeSlots = () => {
  router.push({
    name: 'record',
    params: { record_id: recordId.value },
    query: { 'time-slots': '1' }
  })
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
}

.page-content {
  padding: 0.5rem 0 6em;
}

.result-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 900;
  color: #111827;
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
  margin: 0 0 2.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: #0f5132;
  font-weight: 900;
}

.summary-line {
  line-height: 1.15;
  margin-bottom: 0.5rem;
  font-weight: 700;
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
  margin: 1rem 0;
}

.top-card-header {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.top-card-label {
  font-weight: 800;
  color: #0f5132;
  font-size: 0.85rem;
}

.top-card-title {
  font-weight: 900;
  color: #111827;
  font-size: 2rem;
  text-align: center;
}

.top-card-metrics {
  margin-top: 0.75rem;
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
  background: rgba(66, 185, 131, 0.10);
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

.metric-note-lines {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  color: #0f5132;
  font-weight: 900;
  font-size: 0.9rem;
}

.metric-note-line {
  line-height: 1.15;
}

.metric-note-header {
  line-height: 1.15;
  margin-bottom: 0.5rem;
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
  border-bottom: 1px solid #e5e7eb;
  padding: 0.85rem;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.8rem;
}

.rest-card-title {
  font-weight: 900;
  color: #111827;
}

.rest-card-sub {
  font-weight: 700;
  color: #0f5132;
  display: flex;
  gap: 0.35rem;
}

.dot {
  color: #6b7280;
}

.more-hint {
  color: #6b7280;
  font-weight: 800;
}
</style>
