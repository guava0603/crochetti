<template>
  <div class="record-single-slot-view">
    <div class="page-content">
      <h2 class="title">{{ t('record.singleTimeSlotTitle', { n: slotIndex + 1 }) }}</h2>

      <div v-if="loading" class="empty">{{ t('common.loading') }}</div>
      <div v-else-if="!slot" class="empty">{{ t('record.timeSlotNotFound') }}</div>

      <div v-else class="body">
        <div class="card">
          <div class="row">
            <div class="label">{{ t('record.slotStatus') }}</div>
            <div class="value">
              <template v-if="!editing.status">
                <span class="value-main">{{ statusLabel }}<span v-if="statusNoteDisplay" class="note"> ({{ statusNoteDisplay }})</span></span>
                <button type="button" class="edit-btn" @click="toggleEdit('status')">{{ t('common.edit') }}</button>
              </template>

              <template v-else>
                <span class="value-main">{{ statusLabel }}<span v-if="statusNoteDisplay" class="note"> ({{ statusNoteDisplay }})</span></span>
                <button type="button" class="edit-btn" @click="openStatusModal">{{ t('record.editStatus') }}</button>
                <button type="button" class="edit-btn" @click="toggleEdit('status')">{{ t('common.done') }}</button>
              </template>
            </div>
          </div>

          <div class="row">
            <div class="label">{{ t('record.slotStart') }}</div>
            <div class="value">
              <template v-if="!editing.start">
                <span class="value-main">{{ startDisplay }}</span>
                <button type="button" class="edit-btn" @click="toggleEdit('start')">{{ t('common.edit') }}</button>
              </template>
              <template v-else>
                <input v-model="draftStart" type="datetime-local" class="dt-input" step="1" />
                <button type="button" class="edit-btn" @click="toggleEdit('start')">{{ t('common.done') }}</button>
              </template>
            </div>
          </div>

          <div class="row">
            <div class="label">{{ t('record.slotEnd') }}</div>
            <div class="value">
              <template v-if="!editing.end">
                <span class="value-main">{{ endDisplay }}</span>
                <button type="button" class="edit-btn" @click="toggleEdit('end')">{{ t('common.edit') }}</button>
              </template>
              <template v-else>
                <input v-model="draftEnd" type="datetime-local" class="dt-input" step="1" />
                <button type="button" class="edit-btn" @click="toggleEdit('end')">{{ t('common.done') }}</button>
              </template>
            </div>
          </div>
        </div>

        <div class="bottom-bar">
          <button
            type="button"
            class="confirm-btn"
            :disabled="!isDirty || saving"
            @click="confirmSave"
          >
            {{ saving ? t('common.saving') : t('common.confirm') }}
          </button>
        </div>

        <UpdateStatus
          v-if="modalState.show"
          :title="modalState.title"
          :modalStatusId="modalStatusId"
          :modalStatusNote="modalStatusNote"
          :originalStatuses="originalStatuses"
          :selfDefinedStatuses="selfDefinedStatuses"
          :statusNotes="statusNotes"
          :addStatusNote="addStatusNote"
          :customStatusInput="customStatusInput"
          :onCancel="modalState.onCancel"
          :onConfirm="modalState.onConfirm"
          :handleModalStatusChange="handleModalStatusChange"
          :cancelAddCustomStatus="cancelAddCustomStatus"
          :confirmAddCustomStatus="confirmAddCustomStatus"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { onAuthStateChanged } from 'firebase/auth'

import { auth } from '@/firebaseConfig'
import { fetchUserRecord, setUserRecord } from '@/services/firestore/records'
import { openConfirmation } from '@/services/ui/confirmation'
import { originalStatuses } from '@/constants/status.js'

import UpdateStatus from '@/components/modals/UpdateStatus.vue'

const route = useRoute()
const { t } = useI18n({ useScope: 'global' })

const recordId = ref(route.params.record_id)
const timeSlotId = computed(() => {
  const raw = route.query?.time_slot_id
  const n = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isFinite(n) ? n : null
})

const slotIndex = computed(() => (timeSlotId.value == null ? -1 : timeSlotId.value - 1))

const currentRecord = ref(null)
const currentUser = ref(null)
const loading = ref(true)
const saving = ref(false)

const editing = reactive({ status: false, start: false, end: false })

const draftStatusId = ref(null)
const draftStatusNote = ref('')
const draftStart = ref('')
const draftEnd = ref('')

const slot = computed(() => {
  const idx = slotIndex.value
  const list = currentRecord.value?.time_slots
  if (!Array.isArray(list) || idx < 0 || idx >= list.length) return null
  return list[idx]
})

const selfDefinedStatuses = computed(() => currentRecord.value?.self_defined_status || [])
const statusNotes = computed(() => currentRecord.value?.self_defined_status_notes || [])

const addStatusNote = ({ status_id, description }) => {
  if (!currentRecord.value) return
  const safeStatusId = Number(status_id)
  const safeDescription = String(description || '').trim()
  if (!safeDescription) return

  if (!Array.isArray(currentRecord.value.self_defined_status_notes)) {
    currentRecord.value.self_defined_status_notes = []
  }

  const exists = currentRecord.value.self_defined_status_notes.some(
    n => Number(n?.status_id) === safeStatusId && String(n?.description || '').trim() === safeDescription
  )
  if (exists) return

  currentRecord.value.self_defined_status_notes.push({ status_id: safeStatusId, description: safeDescription })
}

const customStatusInput = ref('')

function handleModalStatusChange(event) {
  const value = event.target.value
  if (value === '__add_custom__') {
    modalStatusId.value = value
    customStatusInput.value = ''
  } else {
    modalStatusId.value = Number(value)
  }
}

function cancelAddCustomStatus() {
  modalStatusId.value = draftStatusId.value
  customStatusInput.value = ''
}

const confirmAddCustomStatus = async (nameArg) => {
  const name = String(nameArg ?? customStatusInput.value).trim()
  if (!name) return null

  const existing = (selfDefinedStatuses.value || [])
    .map(s => String(s?.name || '').trim())
    .filter(Boolean)
  if (existing.includes(name)) {
    const found = (selfDefinedStatuses.value || []).find(s => String(s?.name || '').trim() === name)
    if (found?.id != null) {
      modalStatusId.value = found.id
      customStatusInput.value = ''
      return found.id
    }
  }

  const ids = (selfDefinedStatuses.value || [])
    .map(s => Number(s?.id))
    .filter(n => Number.isFinite(n))
  const maxId = ids.length > 0 ? Math.max(...ids) : 99
  const newStatus = { id: maxId + 1, name }

  if (!currentRecord.value) return null
  if (!Array.isArray(currentRecord.value.self_defined_status)) currentRecord.value.self_defined_status = []
  currentRecord.value.self_defined_status.push(newStatus)

  modalStatusId.value = newStatus.id
  customStatusInput.value = ''
  return newStatus.id
}

const modalStatusId = ref(0)
const modalStatusNote = ref('')

const modalState = reactive({
  show: false,
  title: '',
  onCancel: () => {},
  onConfirm: () => {}
})

const getStatusLabel = (statusId) => {
  if (statusId == null) return '-'

  const original = originalStatuses.find(s => Number(s?.id) === Number(statusId))
  if (original?.nameKey) return t(original.nameKey)

  const custom = (selfDefinedStatuses.value || []).find(s => Number(s?.id) === Number(statusId))
  if (custom?.name) return String(custom.name)

  return String(statusId)
}

const statusLabel = computed(() => {
  if (!slot.value) return '-'
  return getStatusLabel(draftStatusId.value)
})

const statusNoteDisplay = computed(() => String(draftStatusNote.value || '').trim())

const toDatetimeLocal = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''

  const pad2 = (n) => String(n).padStart(2, '0')
  const y = d.getFullYear()
  const m = pad2(d.getMonth() + 1)
  const day = pad2(d.getDate())
  const hh = pad2(d.getHours())
  const mm = pad2(d.getMinutes())
  const ss = pad2(d.getSeconds())
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}`
}

const fromDatetimeLocal = (localStr) => {
  if (!localStr) return null
  const ms = new Date(localStr).getTime()
  if (!Number.isFinite(ms)) return null
  return new Date(ms).toISOString()
}

const startDisplay = computed(() => {
  const iso = fromDatetimeLocal(draftStart.value) || slot.value?.start
  if (!iso) return '-'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString()
})

const endDisplay = computed(() => {
  const iso = fromDatetimeLocal(draftEnd.value) || slot.value?.end
  if (!iso) return t('record.inProgress')
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString()
})

const openStatusModal = () => {
  modalStatusId.value = draftStatusId.value
  modalStatusNote.value = draftStatusNote.value

  modalState.title = t('record.editStatus')
  modalState.onCancel = () => {
    modalState.show = false
  }
  modalState.onConfirm = async (payload) => {
    const nextId = modalStatusId.value
    if (String(nextId) === '__add_custom__') return

    draftStatusId.value = nextId
    draftStatusNote.value = String(payload?.status_note || '').trim()
    modalState.show = false
  }

  modalState.show = true
}

const toggleEdit = (key) => {
  editing[key] = !editing[key]
}

const isDirty = computed(() => {
  if (!slot.value) return false

  const nextStart = fromDatetimeLocal(draftStart.value)
  const nextEnd = fromDatetimeLocal(draftEnd.value)

  const startChanged = nextStart != null && nextStart !== (slot.value?.start || null)
  const endChanged = (nextEnd !== (slot.value?.end || null)) && !(nextEnd == null && slot.value?.end == null)

  const statusChanged = Number(draftStatusId.value) !== Number(slot.value?.status_id)
  const noteChanged = String(draftStatusNote.value || '') !== String(slot.value?.status_note || '')

  return startChanged || endChanged || statusChanged || noteChanged
})

const loadRecord = async () => {
  if (!currentUser.value || !recordId.value) return
  const recordData = await fetchUserRecord(currentUser.value.uid, recordId.value)
  currentRecord.value = recordData || null
}

const resetDraftFromSlot = () => {
  if (!slot.value) return
  draftStatusId.value = slot.value?.status_id ?? null
  draftStatusNote.value = String(slot.value?.status_note || '').trim()
  draftStart.value = toDatetimeLocal(slot.value?.start)
  draftEnd.value = toDatetimeLocal(slot.value?.end)
}

watch(slot, () => {
  resetDraftFromSlot()
}, { immediate: true })

watch(timeSlotId, () => {
  // When navigating between slots, clear edit mode.
  editing.status = false
  editing.start = false
  editing.end = false
})

const confirmSave = async () => {
  if (!currentUser.value || !recordId.value || !slot.value) return
  if (!isDirty.value) return

  const ok = await openConfirmation({
    title: t('common.confirm'),
    message: t('record.confirmUpdateTimeSlot'),
    confirmText: t('common.confirm'),
    cancelText: t('common.cancel'),
    confirmClass: 'btn-confirm'
  })
  if (!ok) return

  const nextStartIso = fromDatetimeLocal(draftStart.value) || slot.value.start
  const nextEndIso = fromDatetimeLocal(draftEnd.value)

  if (!nextStartIso) return

  const nextSlot = {
    ...slot.value,
    start: nextStartIso,
    end: nextEndIso,
    status_id: draftStatusId.value,
    status_note: String(draftStatusNote.value || '').trim()
  }

  // Basic validation: end must be >= start if present
  if (nextSlot.end) {
    const startMs = new Date(nextSlot.start).getTime()
    const endMs = new Date(nextSlot.end).getTime()
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs < startMs) {
      alert(t('record.invalidTimeRange'))
      return
    }
  }

  saving.value = true
  try {
    const nextRecord = JSON.parse(JSON.stringify(currentRecord.value || {}))
    if (!Array.isArray(nextRecord.time_slots)) nextRecord.time_slots = []
    nextRecord.time_slots[slotIndex.value] = nextSlot

    // Persist full record for now.
    await setUserRecord(currentUser.value.uid, recordId.value, nextRecord)
    currentRecord.value = nextRecord
    resetDraftFromSlot()
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    currentUser.value = user || null
    loading.value = true

    try {
      if (user) {
        await loadRecord()
      } else {
        currentRecord.value = null
      }
    } finally {
      loading.value = false
      unsubscribe()
    }
  })
})
</script>

<style scoped>
.record-single-slot-view {
  max-width: 1200px;
  margin: 0 auto;
}

.page-content {
  padding: 0.5rem 0 6em;
}

.title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 900;
  color: #111827;
}

.empty {
  margin-top: 0.75rem;
  color: #6b7280;
  font-weight: 700;
}

.body {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.row {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 0.75rem;
  align-items: center;
}

.label {
  font-weight: 900;
  color: #6b7280;
  font-size: 0.9rem;
}

.value {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}

.value-main {
  font-weight: 900;
  color: #111827;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note {
  color: #6b7280;
  font-weight: 800;
}

.edit-btn {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 10px;
  padding: 0.35rem 0.6rem;
  font-weight: 900;
  color: #0f5132;
  cursor: pointer;
}

.edit-btn:hover {
  background: rgba(66, 185, 131, 0.10);
  border-color: rgba(66, 185, 131, 0.35);
}

.dt-input {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0.45rem 0.6rem;
  font-weight: 800;
  color: #111827;
}

.bottom-bar {
  position: sticky;
  bottom: 0;
  padding: 0.75rem 0 calc(0.75rem + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.confirm-btn {
  width: 100%;
  border: none;
  border-radius: 12px;
  padding: 0.85rem 1rem;
  font-size: 1rem;
  font-weight: 900;
  background: #42b983;
  color: #fff;
  cursor: pointer;
}

.confirm-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}
</style>
