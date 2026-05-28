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
              <span class="value-main">{{ statusLabel }}<span v-if="statusNoteDisplay" class="note"> ({{ statusNoteDisplay }})</span></span>
              <button type="button" class="edit-btn" @click="openStatusModal">{{ t('common.edit') }}</button>
            </div>
          </div>

          <div class="row">
            <div class="label">{{ t('record.slotStart') }}</div>
            <div class="value">
              <input v-model="draftStart" type="datetime-local" class="dt-input" step="1" />
            </div>
          </div>

          <div class="row">
            <div class="label">{{ t('record.slotEnd') }}</div>
            <div class="value">
              <input v-model="draftEnd" type="datetime-local" class="dt-input" step="1" />
            </div>
          </div>
        </div>

        <div class="bottom-bar">
          <ButtonDelete
            :disabled="saving || loading || !slot"
            type="deleteTimeSlot"
            @click="deleteTimeSlot"
          />
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
          :modalStatusId="modalStatusId"
          :modalStatusNote="modalStatusNote"
          :originalStatuses="originalStatuses"
          :recordLinkedStatuses="recordLinkedStatuses"
          :userStatusCatalog="userStatusCatalog"
          :userStatusNotes="userStatusNotes"
          :addStatusNote="addStatusNote"
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
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { setUserRecord } from '@/services/firestore/records'
import { openConfirmation } from '@/services/ui/confirmation'
import { openError } from '@/services/ui/notice'
import { originalStatuses } from '@/constants/status.js'
import { MIN_CUSTOM_STATUS_ID } from '@/constants/recordStatusCatalog'
import { useRecordContext } from '@/composables/recordContext'
import { useUserRecordStatusCatalog } from '@/composables/useUserRecordStatusCatalog'
import { datetimeLocalToIso, isoToDatetimeLocal } from '@/utils/dateTime'
import { resolveRecordStatusLabel } from '@/utils/recordStatusDisplay'

import UpdateStatus from '@/components/modals/UpdateStatus.vue'
import ButtonDelete from '@/components/buttons/ButtonDelete.vue'

const props = defineProps({
  currentUser: { type: Object, default: null },
  profile: { type: Object, default: null }
})

const statusCatalog = useUserRecordStatusCatalog(
  () => props.profile,
  () => props.currentUser?.uid
)

const route = useRoute()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })

const recordCtx = useRecordContext()

const recordId = recordCtx?.recordId || ref(route.params.record_id)
const timeSlotId = computed(() => {
  const raw = route.query?.time_slot_id
  const n = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isFinite(n) ? n : null
})

const slotIndex = computed(() => (timeSlotId.value == null ? -1 : timeSlotId.value - 1))

const currentRecord = recordCtx?.recordData || ref(null)
const currentUser = computed(() => props.currentUser)
const authPending = computed(() => currentUser.value === undefined)
const loading = computed(() => authPending.value || Boolean(recordCtx?.recordLoading?.value))
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

const totalComponentCount = computed(() => {
  const list = currentRecord.value?.component_list
  return Array.isArray(list) ? list.length : 0
})

const slotStartComponentCount = computed(() => {
  const list = slot.value?.end_at_list
  if (!Array.isArray(list)) return null
  let n = 0
  for (const endAt of list) {
    if (endAt && (endAt.row_index != null || endAt.crochet_count != null)) n += 1
  }
  return n
})

const slotStartAtText = computed(() => {
  if (slotStartComponentCount.value == null) return ''
  if (totalComponentCount.value <= 0) return ''
  return t('record.slotStartAt', { n: slotStartComponentCount.value, total: totalComponentCount.value })
})

const userStatusCatalog = computed(() => statusCatalog.catalog.value)
const userStatusNotes = computed(() => statusCatalog.notes.value)

const recordLinkedStatuses = computed(() => {
  return statusCatalog.normalizeRecordLinked(currentRecord.value?.self_defined_status)
})

watch(
  () => currentRecord.value,
  (record) => {
    if (!record) return
    statusCatalog.ensureProfileIncludesRecordStatusData(record).catch((e) => {
      console.warn('RecordSingleTimeSlot: failed to sync status catalog from record:', e)
    })
  },
  { immediate: true }
)

const addStatusNote = ({ status_id, description }) => {
  statusCatalog.addCustomNote({ statusId: status_id, description }).catch((e) => {
    console.warn('RecordSingleTimeSlot: failed to save status note:', e)
  })
}

function handleModalStatusChange(event) {
  const value = event.target.value
  if (value === '__add_custom__') {
    modalStatusId.value = value
  } else {
    modalStatusId.value = Number(value)
  }
}

function cancelAddCustomStatus() {
  modalStatusId.value = draftStatusId.value
}

const confirmAddCustomStatus = async (payload) => {
  if (!currentRecord.value) return null

  const arg = payload && typeof payload === 'object' ? payload : { name: String(payload || '').trim() }
  const pickId = Number(arg.statusId)
  if (Number.isFinite(pickId)) {
    if (pickId >= MIN_CUSTOM_STATUS_ID) {
      const entry = statusCatalog.findCatalogStatusById(pickId)
      if (entry) {
        statusCatalog.linkStatusOnRecord(currentRecord.value, entry)
      }
    }
    modalStatusId.value = pickId
    return { id: pickId }
  }

  const name = String(arg.name || '').trim()
  if (!name) return null

  const entry = await statusCatalog.addCustomStatus(name)
  if (!entry) return null

  statusCatalog.linkStatusOnRecord(currentRecord.value, entry)
  modalStatusId.value = entry.id
  return { id: entry.id }
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
  return resolveRecordStatusLabel(statusId, {
    t,
    userCatalog: userStatusCatalog.value,
    recordLinked: currentRecord.value?.self_defined_status
  })
}

const statusLabel = computed(() => {
  if (!slot.value) return '-'
  return getStatusLabel(draftStatusId.value)
})

const statusNoteDisplay = computed(() => String(draftStatusNote.value || '').trim())

const toDatetimeLocal = (iso) => isoToDatetimeLocal(iso)
const fromDatetimeLocal = (localStr) => datetimeLocalToIso(localStr)

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

const deleteTimeSlot = async () => {
  if (!currentUser.value || !recordId.value || !slot.value) return
  if (slotIndex.value < 0) return

  saving.value = true
  try {
    const nextRecord = JSON.parse(JSON.stringify(currentRecord.value || {}))
    if (!Array.isArray(nextRecord.time_slots)) nextRecord.time_slots = []

    const idx = slotIndex.value
    if (idx < 0 || idx >= nextRecord.time_slots.length) return
    nextRecord.time_slots.splice(idx, 1)

    // Persist full record for now.
    await setUserRecord(currentUser.value.uid, recordId.value, nextRecord)
    currentRecord.value = nextRecord

    // After delete, go back to the time-slot list page.
    await router.push({
      name: 'record',
      params: { record_id: recordId.value },
      query: { 'time-slots': '1' }
    })
  } finally {
    saving.value = false
  }
}

const confirmSave = async () => {
  if (!currentUser.value || !recordId.value || !slot.value) return
  if (!isDirty.value) return

  const ok = await openConfirmation({
    type: 'confirmUpdateTimeSlot'
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
      await openError({
        title: t('common.error'),
        message: t('record.invalidTimeRange'),
        confirmText: t('common.ok')
      })
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
  grid-template-columns: 50px 1fr;
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
  background: rgb(var(--color-icon-add-rgb) / 0.1);
  border-color: rgb(var(--color-icon-add-rgb) / 0.35);
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
  padding: 0.75rem 0 calc(0.75rem + var(--safe-area-bottom));
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  gap: 0.75rem;
}

.bottom-bar :deep(.btn-delete) {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  padding: 0;
}

.confirm-btn {
  flex: 1;
  border: none;
  border-radius: 12px;
  padding: 0 1rem;
  height: 44px;
  font-size: 1rem;
  font-weight: 900;
  background: var(--color-icon-add);
  color: #fff;
  cursor: pointer;
}

.confirm-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}
</style>
