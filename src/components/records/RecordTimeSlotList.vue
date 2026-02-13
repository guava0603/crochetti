<template>
  <div class="record-list-view">
    <div class="page-content">
      <h2 class="time-slots-title">{{ t('record.timeSlotsTitle') }}</h2>

      <div v-if="loading" class="time-slots-empty">
        {{ t('common.loading') }}
      </div>

      <div v-else-if="timeSlots.length === 0" class="time-slots-empty">
        {{ t('record.noTimeSlots') }}
      </div>

      <div v-else class="time-slot-groups">
        <div v-for="group in startTimeGroups" :key="group.key" class="time-slot-group">
          <div class="group-header">
            <div class="group-title">
              <span class="group-hour">{{ group.label }}</span>
            </div>
          </div>

          <div class="slot-list">
            <button
              v-for="item in group.items"
              :key="item.index"
              type="button"
              class="slot-item"
              @click="goSingleTimeSlot(item.index)"
            >
              <span class="slot-index">#{{ item.index + 1 }}</span>
              <span class="slot-status">{{ formatSlotStatusNote(item.slot) }}</span>
              <span class="slot-duration">{{ formatSlotDuration(item.slot) }}</span>
            </button>
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

const route = useRoute()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })

const recordId = ref(route.params.record_id)
const currentRecord = ref(null)
const currentUser = ref(null)
const currentTime = ref(Date.now())
const loading = ref(true)

let timerInterval = null

const timeSlots = computed(() => {
  const slots = currentRecord.value?.time_slots
  return Array.isArray(slots) ? slots : []
})

const getStartHourKey = (slot) => {
  const iso = slot?.start
  if (!iso) return '__unknown__'

  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '__unknown__'

  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  return `${y}-${m}-${day} ${hour}`
}

const formatStartHourLabel = (slot) => {
  const iso = slot?.start
  if (!iso) return t('record.unknownTime')

  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return t('record.unknownTime')

  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  return `${y}/${m}/${day} ${hour}:00`
}

const startTimeGroups = computed(() => {
  const groups = []
  const byKey = new Map()

  for (let index = 0; index < timeSlots.value.length; index++) {
    const slot = timeSlots.value[index]
    const key = getStartHourKey(slot)

    if (!byKey.has(key)) {
      const group = {
        key,
        label: formatStartHourLabel(slot),
        items: []
      }
      byKey.set(key, group)
      groups.push(group)
    }

    byKey.get(key).items.push({ index, slot })
  }

  return groups
})

const goSingleTimeSlot = (index) => {
  const n = Number(index) + 1
  if (!Number.isFinite(n) || n <= 0) return
  router.push({
    name: 'record',
    params: route.params,
    query: { 'time-slots': '1', time_slot_id: String(n) }
  })
}

const formatSlotStatusNote = (slot) => {
  const statusId = slot?.status_id
  const note = String(slot?.status_note || '').trim()

  let statusLabel = '-'
  if (statusId != null) {
    const original = originalStatuses.find(s => Number(s?.id) === Number(statusId))
    if (original?.nameKey) {
      statusLabel = t(original.nameKey)
    } else {
      const custom = (currentRecord.value?.self_defined_status || []).find(s => Number(s?.id) === Number(statusId))
      if (custom?.name) statusLabel = String(custom.name)
      else statusLabel = String(statusId)
    }
  }

  if (!note) return statusLabel
  return `${statusLabel} · ${note}`
}

const formatSlotDuration = (slot) => {
  const startIso = slot?.start
  if (!startIso) return '-'

  const startMs = new Date(startIso).getTime()
  if (!Number.isFinite(startMs)) return '-'

  const endMs = slot?.end ? new Date(slot.end).getTime() : currentTime.value
  if (!Number.isFinite(endMs)) return '-'

  const diffMs = Math.max(0, endMs - startMs)
  const totalSeconds = Math.floor(diffMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad2 = (n) => String(n).padStart(2, '0')
  if (hours > 0) return `${hours}:${pad2(minutes)}:${pad2(seconds)}`
  return `${minutes}:${pad2(seconds)}`
}

const loadRecord = async () => {
  if (!currentUser.value || !recordId.value) return
  const recordData = await fetchUserRecord(currentUser.value.uid, recordId.value)
  currentRecord.value = recordData || null
}

onMounted(() => {
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
.record-list-view {
  max-width: 1200px;
  margin: 0 auto;
}

.page-content {
  padding: 0.5rem 0 6em;
}

.time-slots-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: #111827;
}

.time-slots-empty {
  margin-top: 0.75rem;
  color: #6b7280;
  font-weight: 600;
}

.time-slot-groups {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.time-slot-group {
  background: #fff;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.group-title {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
  color: #6b7280;
}

.group-hour {
  font-weight: 800;
  color: lightgray;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-count {
  font-weight: 800;
  color: #6b7280;
  background: #f3f4f6;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
}

.slot-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.slot-item {
  appearance: none;
  border: none;
  display: grid;
  grid-template-columns: 56px 1fr 75px;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.6rem;
  border-radius: 10px;
  background: #f9fafb;
  cursor: pointer;
  text-align: left;
}

.slot-item:hover {
  background: #f3f4f6;
}

.slot-item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.25);
}

.slot-index {
  appearance: none;
  border: none;
  font-weight: 800;
  color: #6b7280;
}

.slot-status {
  color: #111827;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  word-break: break-word;

.slot-item:hover {
  background: #f3f4f6;
}

.slot-item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.25);
}
}

.slot-duration {
  text-align: right;
  font-weight: 800;
  color: #0f5132;
}
</style>
